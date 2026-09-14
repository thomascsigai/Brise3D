#include <doctest/doctest.h>
#include <Brise/Particle.h>

using Brise::Particle;
using Brise::Vec3;

TEST_CASE("Particle starts at rest at its position with the given mass and radius")
{
	Particle p(Vec3(1.0f, 2.0f, 3.0f), 2.0f, 0.99f, 0.25f);

	CHECK(p.position.x == 1.0f);
	CHECK(p.position.y == 2.0f);
	CHECK(p.position.z == 3.0f);
	CHECK(p.velocity.x == 0.0f);
	CHECK(p.velocity.y == 0.0f);
	CHECK(p.velocity.z == 0.0f);
	CHECK(p.acceleration.x == 0.0f);
	CHECK(p.acceleration.y == 0.0f);
	CHECK(p.acceleration.z == 0.0f);
	CHECK(p.GetMass() == doctest::Approx(2.0f));
	CHECK(p.GetInverseMass() == doctest::Approx(0.5f));
	CHECK(p.HasFiniteMass());
	CHECK(p.radius == 0.25f);
}

TEST_CASE("Particle::Integrate moves the particle by its velocity")
{
	Particle p(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	p.velocity = Vec3(1.0f, 2.0f, -3.0f);

	p.Integrate(0.5f);

	CHECK(p.position.x == doctest::Approx(0.5f));
	CHECK(p.position.y == doctest::Approx(1.0f));
	CHECK(p.position.z == doctest::Approx(-1.5f));
}

TEST_CASE("Particle::Integrate applies acceleration and accumulated forces to velocity")
{
	Particle p(Vec3(0.0f, 0.0f, 0.0f), 2.0f, 1.0f, 0.1f);
	p.acceleration = Vec3(0.0f, -10.0f, 0.0f);
	p.AddForce(Vec3(4.0f, 0.0f, 0.0f)); // a = F / m = 2 along x
	p.AddForce(Vec3(0.0f, 0.0f, 6.0f)); // a = 3 along z, forces accumulate

	p.Integrate(0.5f);

	CHECK(p.velocity.x == doctest::Approx(1.0f));
	CHECK(p.velocity.y == doctest::Approx(-5.0f));
	CHECK(p.velocity.z == doctest::Approx(1.5f));
}

TEST_CASE("Particle::Integrate clears the force accumulator")
{
	Particle p(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	p.AddForce(Vec3(0.0f, 0.0f, 10.0f));

	p.Integrate(1.0f);
	Vec3 afterFirst = p.velocity;
	p.Integrate(1.0f);

	CHECK(p.velocity.z == doctest::Approx(afterFirst.z));
}

TEST_CASE("Particle::Integrate applies damping as a per-second factor")
{
	Particle p(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 0.5f, 0.1f);
	p.velocity = Vec3(0.0f, 0.0f, 8.0f);

	p.Integrate(1.0f);
	CHECK(p.velocity.z == doctest::Approx(4.0f));

	p.Integrate(2.0f);
	CHECK(p.velocity.z == doctest::Approx(1.0f));
}

TEST_CASE("Particle with infinite mass ignores forces and does not move")
{
	Particle p(Vec3(1.0f, 1.0f, 1.0f), 1.0f, 0.99f, 0.1f);
	p.SetInfiniteMass();
	p.velocity = Vec3(5.0f, 5.0f, 5.0f);
	p.acceleration = Vec3(0.0f, -9.81f, 0.0f);
	p.AddForce(Vec3(100.0f, 100.0f, 100.0f));

	p.Integrate(1.0f);

	CHECK_FALSE(p.HasFiniteMass());
	CHECK(p.GetInverseMass() == 0.0f);
	CHECK(p.GetMass() == std::numeric_limits<float>::max());
	CHECK(p.position.x == 1.0f);
	CHECK(p.position.y == 1.0f);
	CHECK(p.position.z == 1.0f);
	CHECK(p.velocity.x == 5.0f);
	CHECK(p.velocity.y == 5.0f);
	CHECK(p.velocity.z == 5.0f);
}

TEST_CASE("Particle mass and damping can be changed after construction")
{
	Particle p(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);

	p.SetMass(4.0f);
	CHECK(p.GetInverseMass() == doctest::Approx(0.25f));

	p.SetDamping(0.5f);
	p.velocity = Vec3(2.0f, 0.0f, 0.0f);
	p.Integrate(1.0f);
	CHECK(p.velocity.x == doctest::Approx(1.0f));
}
