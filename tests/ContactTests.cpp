#include <doctest/doctest.h>
#include <Brise/PContact.h>
#include "TestHelpers.h"

using Brise::Particle;
using Brise::ParticleContact;
using Brise::Vec3;

namespace {
	// Two equal-mass particles closing head-on at 2 m/s each along a unit
	// normal that is not axis-aligned. The contact normal points from b to a
	// (the direction a must move to separate).
	const Vec3 kNormal(2.0f / 7.0f, 3.0f / 7.0f, 6.0f / 7.0f);

	ParticleContact HeadOnContact(Particle& a, Particle& b, float restitution)
	{
		a.velocity = -kNormal * 2.0f;
		b.velocity = kNormal * 2.0f;

		ParticleContact contact;
		contact.particle[0] = &a;
		contact.particle[1] = &b;
		contact.contactNormal = kNormal;
		contact.restitution = restitution;
		contact.penetration = 0.0f;
		return contact;
	}
}

TEST_CASE("ParticleContact::CalculateSeparatingVelocity projects the relative velocity on the 3D normal")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	ParticleContact contact = HeadOnContact(a, b, 1.0f);

	CHECK(contact.CalculateSeparatingVelocity() == doctest::Approx(-4.0f));
}

TEST_CASE("Head-on contact with restitution 1 swaps the velocities along a 3D normal")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	ParticleContact contact = HeadOnContact(a, b, 1.0f);

	contact.Resolve(1.0f / 60.0f);

	CheckVec(a.velocity, kNormal.x * 2.0f, kNormal.y * 2.0f, kNormal.z * 2.0f);
	CheckVec(b.velocity, -kNormal.x * 2.0f, -kNormal.y * 2.0f, -kNormal.z * 2.0f);
}

TEST_CASE("Head-on contact with restitution 0 stops both equal-mass particles")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	ParticleContact contact = HeadOnContact(a, b, 0.0f);

	contact.Resolve(1.0f / 60.0f);

	CheckVec(a.velocity, 0.0f, 0.0f, 0.0f);
	CheckVec(b.velocity, 0.0f, 0.0f, 0.0f);
}

TEST_CASE("Head-on contact with restitution 0.5 separates at half the closing speed")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	ParticleContact contact = HeadOnContact(a, b, 0.5f);

	contact.Resolve(1.0f / 60.0f);

	// Closing at 4 m/s, separating at 2 m/s split evenly between equal masses
	CheckVec(a.velocity, kNormal.x, kNormal.y, kNormal.z);
	CheckVec(b.velocity, -kNormal.x, -kNormal.y, -kNormal.z);
	CHECK(contact.CalculateSeparatingVelocity() == doctest::Approx(2.0f));
}

TEST_CASE("A contact with an infinite-mass particle reflects only the finite one")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle wall(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	wall.SetInfiniteMass();
	ParticleContact contact = HeadOnContact(a, wall, 1.0f);
	wall.velocity = { 0, 0, 0 };

	contact.Resolve(1.0f / 60.0f);

	CheckVec(a.velocity, kNormal.x * 2.0f, kNormal.y * 2.0f, kNormal.z * 2.0f);
	CheckVec(wall.velocity, 0.0f, 0.0f, 0.0f);
}

TEST_CASE("Contacts between two infinite-mass particles leave both untouched")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	a.SetInfiniteMass();
	b.SetInfiniteMass();
	ParticleContact contact = HeadOnContact(a, b, 1.0f);
	contact.penetration = 1.0f;

	contact.Resolve(1.0f / 60.0f);

	CheckVec(a.velocity, -kNormal.x * 2.0f, -kNormal.y * 2.0f, -kNormal.z * 2.0f);
	CheckVec(b.velocity, kNormal.x * 2.0f, kNormal.y * 2.0f, kNormal.z * 2.0f);
	CheckVec(a.position, 0.0f, 0.0f, 0.0f);
	CheckVec(b.position, 0.0f, 0.0f, 0.0f);
}

TEST_CASE("Interpenetration is corrected along the normal in proportion to inverse mass")
{
	// a is twice as heavy as b, so b moves twice as far
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 2.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	ParticleContact contact = HeadOnContact(a, b, 0.0f);
	a.velocity = { 0, 0, 0 };
	b.velocity = { 0, 0, 0 };
	contact.penetration = 1.5f;

	contact.Resolve(1.0f / 60.0f);

	// The resolver removes 80% of the penetration per resolution: 1.2 m of
	// separation, split 1/3 to a and 2/3 to b.
	Vec3 separation = a.position - b.position;
	CHECK(Brise::Dot(separation, kNormal) == doctest::Approx(1.2f));
	CheckVec(a.position, kNormal.x * 0.4f, kNormal.y * 0.4f, kNormal.z * 0.4f);
	CheckVec(b.position, -kNormal.x * 0.8f, -kNormal.y * 0.8f, -kNormal.z * 0.8f);
}

TEST_CASE("Interpenetration with an infinite-mass particle moves only the finite one")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle wall(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	wall.SetInfiniteMass();
	ParticleContact contact = HeadOnContact(a, wall, 0.0f);
	a.velocity = { 0, 0, 0 };
	wall.velocity = { 0, 0, 0 };
	contact.penetration = 1.0f;

	contact.Resolve(1.0f / 60.0f);

	CheckVec(a.position, kNormal.x * 0.8f, kNormal.y * 0.8f, kNormal.z * 0.8f);
	CheckVec(wall.position, 0.0f, 0.0f, 0.0f);
}

TEST_CASE("Separating particles receive no impulse")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	ParticleContact contact = HeadOnContact(a, b, 1.0f);
	a.velocity = kNormal * 3.0f; // already moving apart
	b.velocity = { 0, 0, 0 };

	contact.Resolve(1.0f / 60.0f);

	CheckVec(a.velocity, kNormal.x * 3.0f, kNormal.y * 3.0f, kNormal.z * 3.0f);
	CheckVec(b.velocity, 0.0f, 0.0f, 0.0f);
}

TEST_CASE("ParticleContactResolver resolves the fastest-closing contact first within its iteration budget")
{
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle c(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle d(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);

	std::vector<ParticleContact> contacts(2);
	contacts[0] = HeadOnContact(a, b, 0.0f); // closing at 4 m/s
	contacts[1] = HeadOnContact(c, d, 0.0f);
	c.velocity = -kNormal * 5.0f;             // closing at 10 m/s: more urgent
	d.velocity = kNormal * 5.0f;

	SUBCASE("one iteration only resolves the most urgent contact")
	{
		Brise::ParticleContactResolver resolver(1);
		resolver.ResolveContacts(contacts, 2, 1.0f / 60.0f);

		CHECK(contacts[1].CalculateSeparatingVelocity() == doctest::Approx(0.0f));
		CHECK(contacts[0].CalculateSeparatingVelocity() == doctest::Approx(-4.0f));
	}

	SUBCASE("enough iterations resolve every contact")
	{
		Brise::ParticleContactResolver resolver(2);
		resolver.ResolveContacts(contacts, 2, 1.0f / 60.0f);

		CHECK(contacts[0].CalculateSeparatingVelocity() == doctest::Approx(0.0f));
		CHECK(contacts[1].CalculateSeparatingVelocity() == doctest::Approx(0.0f));
	}
}

TEST_CASE("Resolving a contact updates the penetration of other contacts sharing its particles")
{
	// a sits 1 m below the ground with b resting exactly on top of it
	Particle a(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	Particle b(Vec3(0.0f, 0.0f, 0.0f), 1.0f, 1.0f, 0.1f);
	a.acceleration = { 0, 0, 0 };
	b.acceleration = { 0, 0, 0 };

	std::vector<ParticleContact> contacts(2);
	contacts[0].particle[0] = &a;
	contacts[0].particle[1] = nullptr;
	contacts[0].contactNormal = Vec3(0.0f, 1.0f, 0.0f);
	contacts[0].penetration = 1.0f;
	contacts[0].restitution = 0.0f;

	contacts[1].particle[0] = &b;
	contacts[1].particle[1] = &a;
	contacts[1].contactNormal = Vec3(0.0f, 1.0f, 0.0f);
	contacts[1].penetration = 0.0f;
	contacts[1].restitution = 0.0f;

	// One iteration: only the ground contact is penetrating, so it is the one
	// resolved, and pushing a out of the ground pushes it into b
	Brise::ParticleContactResolver resolver(1);
	resolver.ResolveContacts(contacts, 2, 1.0f / 60.0f);

	CHECK(a.position.y == doctest::Approx(0.8f));
	CHECK(contacts[0].penetration == doctest::Approx(0.2f));
	CHECK(contacts[1].penetration == doctest::Approx(0.8f));
}
