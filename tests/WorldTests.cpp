#include <doctest/doctest.h>
#include <Brise/World.h>

#include <memory>

using Brise::Particle;
using Brise::Vec3;
using Brise::World;

TEST_CASE("World refuses particles beyond its capacity")
{
	World world(2, 10);

	Particle* first = world.AddParticle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle* second = world.AddParticle(Vec3(1.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle* third = world.AddParticle(Vec3(2.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);

	CHECK(first != nullptr);
	CHECK(second != nullptr);
	CHECK(third == nullptr);
	CHECK(world.GetParticles().size() == 2);
	CHECK(world.GetCapacity() == 2);
}

TEST_CASE("World particles fall under gravity along -y")
{
	World world(1, 0);
	Particle* p = world.AddParticle(Vec3(1.0f, 10.0f, 2.0f), 1.0f, 1.0f, 0.1f);

	world.Update(1.0f);

	CHECK(p->velocity.x == doctest::Approx(0.0f));
	CHECK(p->velocity.y == doctest::Approx(-9.81f).epsilon(0.001f));
	CHECK(p->velocity.z == doctest::Approx(0.0f));
	CHECK(p->position.x == doctest::Approx(1.0f));
	CHECK(p->position.y < 10.0f);
	CHECK(p->position.z == doctest::Approx(2.0f));
}

TEST_CASE("World advances by whole fixed steps and carries the remainder over")
{
	World world(1, 0, 0.5f);
	Particle* p = world.AddParticle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	p->velocity = Vec3(1.0f, 0.0f, 0.0f);

	world.Update(0.25f);
	CHECK(p->position.x == doctest::Approx(0.0f)); // less than one step accumulated

	world.Update(0.25f);
	CHECK(p->position.x == doctest::Approx(0.5f)); // exactly one step

	world.Update(1.25f);
	CHECK(p->position.x == doctest::Approx(1.5f)); // two more steps, 0.25 s carried over
}

TEST_CASE("World owns its force generators and applies registered ones every step")
{
	World world(1, 0, 1.0f);
	Particle* p = world.AddParticle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	p->acceleration = { 0, 0, 0 }; // cancel gravity to isolate the generator

	Brise::ParticleForceGenerator* push =
		world.AddForceGenerator(std::make_unique<Brise::ParticleGravity>(Vec3(0.0f, 0.0f, 2.0f)));
	world.AddForceGenToRegistry(p, push);

	world.Update(1.0f);
	CHECK(p->velocity.z == doctest::Approx(2.0f));

	world.Update(1.0f);
	CHECK(p->velocity.z == doctest::Approx(4.0f));
}

TEST_CASE("Rod keeps its length while the free end swings under gravity")
{
	World world(2, 10);
	Particle* pivot = world.AddParticle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	pivot->SetInfiniteMass();
	Particle* bob = world.AddParticle(Vec3(1.2f, 0.0f, 1.6f), 1.0f, 0.99f, 0.1f); // 2 m away, horizontal

	world.AddLink(std::make_unique<Brise::ParticleRod>(pivot, bob, 2.0f));

	for (int i = 0; i < 60; i++) {
		world.Update(1.0f / 60.0f);
		float length = Brise::Magnitude(bob->position - pivot->position);
		CHECK(length == doctest::Approx(2.0f).epsilon(0.01f));
	}

	CHECK(bob->position.y < -0.5f); // it did swing down
}

TEST_CASE("Cable never exceeds its max length after a step")
{
	World world(2, 10);
	Particle* pivot = world.AddParticle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	pivot->SetInfiniteMass();
	Particle* bob = world.AddParticle(Vec3(0.0f, -1.0f, 0.0f), 1.0f, 0.99f, 0.1f);

	world.AddLink(std::make_unique<Brise::ParticleCable>(pivot, bob, 3.0f, 0.0f));

	// The resolver corrects 80% of an overshoot per iteration, so allow a
	// small residual on the step the cable first goes taut.
	for (int i = 0; i < 120; i++) {
		world.Update(1.0f / 60.0f);
		float length = Brise::Magnitude(bob->position - pivot->position);
		CHECK(length <= 3.0f + 0.02f);
	}

	// It hangs at the end of the cable rather than stopping short
	CHECK(bob->position.y == doctest::Approx(-3.0f).epsilon(0.01f));
}

TEST_CASE("Removing a link stops it generating contacts while other links keep working")
{
	World world(3, 10);
	Particle* pivot = world.AddParticle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	pivot->SetInfiniteMass();
	Particle* a = world.AddParticle(Vec3(1.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle* b = world.AddParticle(Vec3(-1.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);

	Brise::LinkId rodA = world.AddLink(std::make_unique<Brise::ParticleRod>(pivot, a, 1.0f));
	Brise::LinkId rodB = world.AddLink(std::make_unique<Brise::ParticleRod>(pivot, b, 1.0f));
	CHECK(rodA != rodB);

	world.RemoveLink(rodA);
	world.Update(1.0f);

	// a fell freely; b is still held at 1 m
	CHECK(Brise::Magnitude(a->position - pivot->position) > 2.0f);
	CHECK(Brise::Magnitude(b->position - pivot->position) == doctest::Approx(1.0f).epsilon(0.01f));
}

TEST_CASE("World only generates up to maxContacts contacts per step")
{
	World world(3, 1);
	Particle* pivot = world.AddParticle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	pivot->SetInfiniteMass();
	Particle* a = world.AddParticle(Vec3(1.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle* b = world.AddParticle(Vec3(-1.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);

	world.AddLink(std::make_unique<Brise::ParticleRod>(pivot, a, 1.0f));
	world.AddLink(std::make_unique<Brise::ParticleRod>(pivot, b, 1.0f));

	world.Update(1.0f);

	// Only the first rod fits in the contact budget; the second never holds
	CHECK(Brise::Magnitude(a->position - pivot->position) == doctest::Approx(1.0f).epsilon(0.01f));
	CHECK(Brise::Magnitude(b->position - pivot->position) > 2.0f);
}
