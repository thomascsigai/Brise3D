#include <doctest/doctest.h>
#include <Brise/PForceGen.h>
#include "TestHelpers.h"

using Brise::Particle;
using Brise::Vec3;

namespace {
	// The force accumulator is private, so observe the force through one
	// integration step: with mass 1, no damping and no base acceleration,
	// the velocity after one second equals the applied force.
	Vec3 ForceAppliedBy(Brise::ParticleForceGenerator& fg, Particle& particle)
	{
		particle.SetMass(1.0f);
		particle.SetDamping(1.0f);
		particle.velocity = { 0, 0, 0 };
		particle.acceleration = { 0, 0, 0 };

		fg.UpdateForce(&particle, 1.0f);
		particle.Integrate(1.0f);

		return particle.velocity;
	}
}

TEST_CASE("ParticleSpring pulls a stretched particle towards the other along the 3D axis between them")
{
	// Other sits 5 m away along (0, 0.6, 0.8); rest length 2 leaves 3 m of stretch.
	Particle other(Vec3(0.0f, 3.0f, 4.0f), 1.0f, 1.0f, 0.1f);
	Particle particle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Brise::ParticleSpring spring(&other, 10.0f, 2.0f);

	// |F| = k * (5 - 2) = 30, towards other
	CheckVec(ForceAppliedBy(spring, particle), 0.0f, 18.0f, 24.0f);
}

TEST_CASE("ParticleSpring pushes a compressed particle away from the other")
{
	// Other is 1 m away along x; rest length 3 means 2 m of compression.
	Particle other(Vec3(1.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle particle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Brise::ParticleSpring spring(&other, 5.0f, 3.0f);

	// |F| = k * (3 - 1) = 10, away from other
	CheckVec(ForceAppliedBy(spring, particle), -10.0f, 0.0f, 0.0f);
}

TEST_CASE("AnchoredParticleSpring pulls towards a fixed 3D anchor")
{
	// Anchor is 7 m away along (2, 3, 6) / 7; rest length 4 leaves 3 m of stretch.
	Particle particle(Vec3(1.0f, 1.0f, 1.0f), 1.0f, 1.0f, 0.1f);
	Brise::AnchoredParticleSpring spring(Vec3(3.0f, 4.0f, 7.0f), 2.0f, 4.0f);

	// |F| = k * 3 = 6, along (2, 3, 6) / 7
	CheckVec(ForceAppliedBy(spring, particle), 12.0f / 7.0f, 18.0f / 7.0f, 36.0f / 7.0f);
}

TEST_CASE("ParticleBungee only pulls when stretched beyond its rest length")
{
	Particle other(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Brise::ParticleBungee bungee(&other, 4.0f, 5.0f);

	SUBCASE("slack bungee applies no force")
	{
		// 3 m apart, under the 5 m rest length
		Particle particle(Vec3(0.0f, 0.0f, 3.0f), 1.0f, 1.0f, 0.1f);
		CheckVec(ForceAppliedBy(bungee, particle), 0.0f, 0.0f, 0.0f);
	}

	SUBCASE("stretched bungee pulls towards the other")
	{
		// 7 m apart along (6, 2, 3) / 7, 2 m over the rest length
		Particle particle(Vec3(6.0f, 2.0f, 3.0f), 1.0f, 1.0f, 0.1f);
		// |F| = k * 2 = 8, towards other
		CheckVec(ForceAppliedBy(bungee, particle), -48.0f / 7.0f, -16.0f / 7.0f, -24.0f / 7.0f);
	}
}

TEST_CASE("ParticleGravity applies weight along the given 3D acceleration and skips infinite mass")
{
	Brise::ParticleGravity gravity(Vec3(0.0f, -10.0f, 0.0f));

	Particle particle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	CheckVec(ForceAppliedBy(gravity, particle), 0.0f, -10.0f, 0.0f);

	Particle heavy(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	heavy.SetInfiniteMass();
	gravity.UpdateForce(&heavy, 1.0f);
	heavy.Integrate(1.0f);
	CheckVec(heavy.velocity, 0.0f, 0.0f, 0.0f);
}

TEST_CASE("ParticleForceRegistry applies every registered generator once per update and stops after removal")
{
	Brise::ParticleForceRegistry registry;
	Brise::ParticleGravity gravity(Vec3(0.0f, -10.0f, 0.0f));
	Brise::ParticleGravity sideways(Vec3(3.0f, 0.0f, 0.0f));
	Particle particle(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);

	registry.Add(&particle, &gravity);
	registry.Add(&particle, &gravity); // duplicate registration is ignored
	registry.Add(&particle, &sideways);

	registry.UpdateForces(1.0f);
	particle.Integrate(1.0f);
	CheckVec(particle.velocity, 3.0f, -10.0f, 0.0f);

	registry.Remove(&particle, &gravity);
	particle.velocity = { 0, 0, 0 };
	registry.UpdateForces(1.0f);
	particle.Integrate(1.0f);
	CheckVec(particle.velocity, 3.0f, 0.0f, 0.0f);
}
