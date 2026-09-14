#include <doctest/doctest.h>
#include <Brise/CApi.h>
#include "TestHelpers.h"

#include <cmath>

TEST_CASE("C API: a new world is empty, hands out particle indices in order and refuses particles beyond its capacity")
{
	BriseWorld* world = world_create(2, 10);
	CHECK(world_particle_count(world) == 0);

	CHECK(world_add_particle(world, 0.0f, 1.0f, 2.0f, 1.0f, 1.0f, 0.1f) == 0);
	CHECK(world_add_particle(world, 3.0f, 4.0f, 5.0f, 1.0f, 1.0f, 0.2f) == 1);
	CHECK(world_add_particle(world, 6.0f, 7.0f, 8.0f, 1.0f, 1.0f, 0.3f) == -1);
	CHECK(world_particle_count(world) == 2);

	// The buffers reflect the particles as soon as they are added
	const float* positions = world_positions_ptr(world);
	CHECK(positions[0] == 0.0f);
	CHECK(positions[1] == 1.0f);
	CHECK(positions[2] == 2.0f);
	CHECK(positions[3] == 3.0f);
	CHECK(positions[4] == 4.0f);
	CHECK(positions[5] == 5.0f);

	const float* radii = world_radii_ptr(world);
	CHECK(radii[0] == 0.1f);
	CHECK(radii[1] == 0.2f);

	world_destroy(world);
}

TEST_CASE("C API: world_update advances the simulation and refreshes the positions buffer")
{
	BriseWorld* world = world_create(1, 0);
	int p = world_add_particle(world, 1.0f, 10.0f, 2.0f, 1.0f, 1.0f, 0.1f);
	const float* positions = world_positions_ptr(world);

	SUBCASE("a particle falls under the default gravity")
	{
		world_update(world, 1.0f);

		CHECK(positions[3 * p + 0] == doctest::Approx(1.0f));
		CHECK(positions[3 * p + 1] < 10.0f);
		CHECK(positions[3 * p + 2] == doctest::Approx(2.0f));
	}

	SUBCASE("a velocity set through the bridge moves the particle")
	{
		world_set_acceleration(world, p, 0.0f, 0.0f, 0.0f); // cancel gravity
		world_set_velocity(world, p, 2.0f, 0.0f, 0.0f);
		world_update(world, 1.0f);

		CHECK(positions[3 * p + 0] == doctest::Approx(3.0f));
		CHECK(positions[3 * p + 1] == doctest::Approx(10.0f));
		CHECK(positions[3 * p + 2] == doctest::Approx(2.0f));
	}

	SUBCASE("an acceleration set through the bridge replaces gravity")
	{
		world_set_acceleration(world, p, 0.0f, 0.0f, 4.0f);
		world_update(world, 1.0f);

		CHECK(positions[3 * p + 1] == doctest::Approx(10.0f));
		CHECK(positions[3 * p + 2] > 2.0f);
	}

	world_destroy(world);
}

static float DistanceBetween(const BriseWorld* world, int a, int b)
{
	const float* p = world_positions_ptr(world);
	float dx = p[3 * a + 0] - p[3 * b + 0];
	float dy = p[3 * a + 1] - p[3 * b + 1];
	float dz = p[3 * a + 2] - p[3 * b + 2];
	return std::sqrt(dx * dx + dy * dy + dz * dz);
}

TEST_CASE("C API: links between an infinite-mass pivot and a bob")
{
	BriseWorld* world = world_create(2, 10);
	int pivot = world_add_particle(world, 0.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.1f); // mass 0: infinite mass
	const float* positions = world_positions_ptr(world);

	SUBCASE("a rod keeps its length while the bob swings under gravity")
	{
		int bob = world_add_particle(world, 1.2f, 0.0f, 1.6f, 1.0f, 0.99f, 0.1f); // 2 m away
		int rod = world_add_rod(world, pivot, bob, 2.0f);
		CHECK(rod >= 0);

		for (int i = 0; i < 60; i++) {
			world_update(world, 1.0f / 60.0f);
			CHECK(DistanceBetween(world, pivot, bob) == doctest::Approx(2.0f).epsilon(0.01f));
		}
		CHECK(positions[3 * bob + 1] < -0.5f);
		CheckVec({ positions[3 * pivot], positions[3 * pivot + 1], positions[3 * pivot + 2] }, 0.0f, 0.0f, 0.0f);
	}

	SUBCASE("a cable lets the bob hang at its max length")
	{
		int bob = world_add_particle(world, 0.0f, -1.0f, 0.0f, 1.0f, 0.99f, 0.1f);
		CHECK(world_add_cable(world, pivot, bob, 3.0f, 0.0f) >= 0);

		for (int i = 0; i < 120; i++) {
			world_update(world, 1.0f / 60.0f);
			CHECK(DistanceBetween(world, pivot, bob) <= 3.0f + 0.02f);
		}
		CHECK(positions[3 * bob + 1] == doctest::Approx(-3.0f).epsilon(0.01f));
	}

	SUBCASE("removing a link by id lets the bob fall")
	{
		int bob = world_add_particle(world, 1.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		int rod = world_add_rod(world, pivot, bob, 1.0f);
		world_remove_link(world, rod);

		world_update(world, 1.0f);
		CHECK(DistanceBetween(world, pivot, bob) > 2.0f);
	}

	world_destroy(world);
}

TEST_CASE("C API: force generators registered through the bridge act on their particles")
{
	BriseWorld* world = world_create(2, 0);
	const float* positions = world_positions_ptr(world);

	SUBCASE("gravity generator accelerates a particle whose gravity acceleration was cancelled")
	{
		int p = world_add_particle(world, 0.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		world_set_acceleration(world, p, 0.0f, 0.0f, 0.0f);
		world_add_gravity(world, p, 0.0f, 0.0f, 2.0f);

		world_update(world, 1.0f);

		// z = a t^2 / 2 with a = 2 m/s^2 over 1 s
		CHECK(positions[3 * p + 0] == doctest::Approx(0.0f));
		CHECK(positions[3 * p + 1] == doctest::Approx(0.0f));
		CHECK(positions[3 * p + 2] == doctest::Approx(1.0f).epsilon(0.02f));
	}

	SUBCASE("spring pulls both particles towards each other symmetrically")
	{
		int a = world_add_particle(world, -2.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		int b = world_add_particle(world, 2.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		world_set_acceleration(world, a, 0.0f, 0.0f, 0.0f);
		world_set_acceleration(world, b, 0.0f, 0.0f, 0.0f);
		world_add_spring(world, a, b, 1.0f, 1.0f);

		world_update(world, 0.5f);

		CHECK(positions[3 * a + 0] > -2.0f);
		CHECK(positions[3 * b + 0] < 2.0f);
		CHECK(positions[3 * a + 0] == doctest::Approx(-positions[3 * b + 0]));
	}

	SUBCASE("anchored spring pulls a particle towards its anchor")
	{
		int p = world_add_particle(world, 0.0f, 3.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		world_set_acceleration(world, p, 0.0f, 0.0f, 0.0f);
		world_add_anchored_spring(world, p, 0.0f, 0.0f, 0.0f, 1.0f, 1.0f);

		world_update(world, 0.5f);

		CHECK(positions[3 * p + 1] < 3.0f);
		CHECK(positions[3 * p + 1] > 1.0f);
	}

	SUBCASE("bungee leaves particles closer than its rest length alone")
	{
		int a = world_add_particle(world, 0.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.1f); // infinite mass
		int b = world_add_particle(world, 0.5f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		world_set_acceleration(world, b, 0.0f, 0.0f, 0.0f);
		world_add_bungee(world, a, b, 1.0f, 1.0f);

		world_update(world, 0.5f);

		CHECK(positions[3 * b + 0] == doctest::Approx(0.5f));
	}

	SUBCASE("bungee pulls particles further apart than its rest length together")
	{
		int a = world_add_particle(world, 0.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.1f); // infinite mass
		int b = world_add_particle(world, 3.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		world_set_acceleration(world, b, 0.0f, 0.0f, 0.0f);
		world_add_bungee(world, a, b, 1.0f, 1.0f);

		world_update(world, 0.5f);

		CHECK(positions[3 * b + 0] < 3.0f);
		CHECK(positions[3 * a + 0] == doctest::Approx(0.0f));
	}

	SUBCASE("buoyancy lifts a submerged particle")
	{
		int p = world_add_particle(world, 0.0f, -1.0f, 0.0f, 1.0f, 1.0f, 0.1f);
		world_set_acceleration(world, p, 0.0f, 0.0f, 0.0f);
		world_add_buoyancy(world, p, 0.5f, 0.01f, 0.0f, 1000.0f);

		world_update(world, 0.5f);

		CHECK(positions[3 * p + 1] > -1.0f);
	}

	world_destroy(world);
}

TEST_CASE("C API: scenery contact generators enabled through the bridge")
{
	BriseWorld* world = world_create(2, 10);
	const float* positions = world_positions_ptr(world);

	SUBCASE("a particle dropped on the ground plane comes to rest at y = radius")
	{
		int p = world_add_particle(world, 0.0f, 3.0f, 0.0f, 1.0f, 0.99f, 0.25f);
		world_add_ground_plane(world, 1.0f, 0.0f);

		for (int i = 0; i < 180; i++) {
			world_update(world, 1.0f / 60.0f);
		}

		CHECK(positions[3 * p + 1] == doctest::Approx(1.25f).epsilon(0.01f));
	}

	SUBCASE("overlapping particles are pushed apart once particle collisions are enabled")
	{
		int a = world_add_particle(world, 0.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.4f);
		int b = world_add_particle(world, 0.5f, 0.0f, 0.0f, 1.0f, 1.0f, 0.4f);
		world_set_acceleration(world, a, 0.0f, 0.0f, 0.0f);
		world_set_acceleration(world, b, 0.0f, 0.0f, 0.0f);

		world_update(world, 1.0f / 120.0f);
		CHECK(DistanceBetween(world, a, b) == doctest::Approx(0.5f)); // off by default

		world_enable_particle_collisions(world, 0.0f);
		world_update(world, 1.0f / 120.0f);
		CHECK(DistanceBetween(world, a, b) > 0.5f);
	}

	world_destroy(world);
}

TEST_CASE("C API: invalid particle indices and link ids are rejected without touching the world")
{
	BriseWorld* world = world_create(1, 10);
	int p = world_add_particle(world, 0.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f);
	world_set_acceleration(world, p, 0.0f, 0.0f, 0.0f);

	for (int bad : { -1, 1, 42 }) {
		world_set_velocity(world, bad, 1.0f, 0.0f, 0.0f);
		world_set_acceleration(world, bad, 1.0f, 0.0f, 0.0f);
		world_add_gravity(world, bad, 0.0f, 0.0f, 1.0f);
		world_add_spring(world, p, bad, 1.0f, 1.0f);
		world_add_spring(world, bad, p, 1.0f, 1.0f);
		world_add_anchored_spring(world, bad, 5.0f, 0.0f, 0.0f, 1.0f, 1.0f);
		world_add_bungee(world, p, bad, 1.0f, 0.1f);
		world_add_buoyancy(world, bad, 0.5f, 0.01f, 5.0f, 1000.0f);
		CHECK(world_add_rod(world, p, bad, 1.0f) == -1);
		CHECK(world_add_cable(world, bad, p, 1.0f, 0.0f) == -1);
	}
	world_remove_link(world, -1);
	world_remove_link(world, 7);

	world_update(world, 1.0f);

	const float* positions = world_positions_ptr(world);
	CheckVec({ positions[0], positions[1], positions[2] }, 0.0f, 0.0f, 0.0f);
	CHECK(world_particle_count(world) == 1);

	world_destroy(world);
}

TEST_CASE("C API: world_create rejects negative sizes and world_destroy accepts NULL")
{
	CHECK(world_create(-1, 10) == nullptr);
	CHECK(world_create(10, -1) == nullptr);
	world_destroy(nullptr);

	BriseWorld* empty = world_create(0, 0);
	REQUIRE(empty != nullptr);
	CHECK(world_particle_count(empty) == 0);
	CHECK(world_add_particle(empty, 0.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.1f) == -1);
	world_update(empty, 1.0f);
	world_destroy(empty);
}
