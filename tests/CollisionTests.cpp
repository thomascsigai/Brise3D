#include <doctest/doctest.h>
#include <Brise/PCollision.h>
#include "TestHelpers.h"

#include <vector>

using Brise::GroundPlane;
using Brise::Particle;
using Brise::ParticleCollision;
using Brise::ParticleContact;
using Brise::Vec3;

TEST_CASE("GroundPlane emits a contact for every particle below the plane")
{
	std::vector<Particle> particles;
	particles.emplace_back(Vec3(0.0f, 5.0f, 0.0f), 1.0f, 1.0f, 0.5f);  // well above
	particles.emplace_back(Vec3(1.0f, 1.3f, 2.0f), 1.0f, 1.0f, 0.5f);  // resting on the plane, penetrating 0.2 m
	particles.emplace_back(Vec3(0.0f, 1.5f, 0.0f), 1.0f, 1.0f, 0.5f);  // exactly touching: not a contact
	particles.emplace_back(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);  // fallen through, penetrating 1.5 m

	GroundPlane ground(&particles, 1.0f, 0.3f);
	std::vector<ParticleContact> contacts(4);

	unsigned used = ground.AddContact(contacts.data(), 4);

	REQUIRE(used == 2);

	CHECK(contacts[0].particle[0] == &particles[1]);
	CHECK(contacts[0].particle[1] == nullptr);
	CheckVec(contacts[0].contactNormal, 0.0f, 1.0f, 0.0f);
	CHECK(contacts[0].penetration == doctest::Approx(0.2f));
	CHECK(contacts[0].restitution == doctest::Approx(0.3f));

	CHECK(contacts[1].particle[0] == &particles[3]);
	CHECK(contacts[1].particle[1] == nullptr);
	CheckVec(contacts[1].contactNormal, 0.0f, 1.0f, 0.0f);
	CHECK(contacts[1].penetration == doctest::Approx(1.5f));
}

TEST_CASE("GroundPlane writes no more contacts than the limit")
{
	std::vector<Particle> particles;
	particles.emplace_back(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);
	particles.emplace_back(Vec3(1.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);
	particles.emplace_back(Vec3(2.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);

	GroundPlane ground(&particles, 0.0f, 0.0f);
	std::vector<ParticleContact> contacts(3);
	contacts[2].particle[0] = nullptr;

	CHECK(ground.AddContact(contacts.data(), 2) == 2);
	CHECK(contacts[2].particle[0] == nullptr); // the third slot was never touched
	CHECK(ground.AddContact(contacts.data(), 0) == 0);
}

TEST_CASE("ParticleCollision emits a contact for every pair closer than the sum of their radii")
{
	std::vector<Particle> particles;
	particles.emplace_back(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);
	particles.emplace_back(Vec3(0.6f, 0.0f, 0.8f), 1.0f, 1.0f, 0.7f); // 1 m from the first: overlapping by 0.2
	particles.emplace_back(Vec3(0.0f, 5.0f, 0.0f), 1.0f, 1.0f, 0.5f); // far from both
	particles.emplace_back(Vec3(0.0f, 4.0f, 0.0f), 1.0f, 1.0f, 0.5f); // exactly touching the third: not a contact

	ParticleCollision collision(&particles, 0.4f);
	std::vector<ParticleContact> contacts(6);

	unsigned used = collision.AddContact(contacts.data(), 6);

	REQUIRE(used == 1);
	CHECK(contacts[0].particle[0] == &particles[0]);
	CHECK(contacts[0].particle[1] == &particles[1]);
	CheckVec(contacts[0].contactNormal, -0.6f, 0.0f, -0.8f); // from the second towards the first
	CHECK(contacts[0].penetration == doctest::Approx(0.2f));
	CHECK(contacts[0].restitution == doctest::Approx(0.4f));
}

TEST_CASE("ParticleCollision writes no more contacts than the limit")
{
	// Three coincident particles: every pair overlaps
	std::vector<Particle> particles;
	particles.emplace_back(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);
	particles.emplace_back(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);
	particles.emplace_back(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.5f);

	ParticleCollision collision(&particles, 0.0f);
	std::vector<ParticleContact> contacts(3);
	contacts[2].particle[0] = nullptr;

	CHECK(collision.AddContact(contacts.data(), 2) == 2);
	CHECK(contacts[2].particle[0] == nullptr); // the third slot was never touched
	CHECK(collision.AddContact(contacts.data(), 0) == 0);
	CHECK(collision.AddContact(contacts.data(), 3) == 3);
}
