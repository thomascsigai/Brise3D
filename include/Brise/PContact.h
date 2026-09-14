#pragma once

#include <Brise/Particle.h>
#include <Brise/Vec3.h>

#include <limits>
#include <vector>

namespace Brise {

	class ParticleContact {

	public:
		// Holds the particles involved in the contact
		// Second can be null for contacts with the scenery
		Particle* particle[2];

		float restitution;
		Vec3 contactNormal;
		float penetration;

		// How far each particle was moved by the last interpenetration
		// resolution; the resolver uses it to update the penetration of
		// other contacts involving the same particles.
		Vec3 particleMovement[2];

	public:

		void Resolve(float duration);
		float CalculateSeparatingVelocity() const;

	private:

		void ResolveVelocity(float duration);
		void ResolveInterpenetration(float duration);

	};

	class ParticleContactResolver {
		
	protected:

		unsigned iterations;
		unsigned iterationsUsed = 0;

	public:

		ParticleContactResolver(unsigned iterations);

		void SetIterations(unsigned iterations);
		unsigned GetIterations() const;
		// Iterations spent by the last ResolveContacts
		unsigned GetIterationsUsed() const;
		void ResolveContacts(std::vector<ParticleContact>& contactArray, unsigned numContacts, float duration);

	};

	class ParticleContactGenerator {
	public:
		virtual ~ParticleContactGenerator() = default;

		// Writes up to limit contacts starting at contact and returns how many
		// were written. contact points at the first of limit free slots.
		virtual unsigned AddContact(ParticleContact* contact, unsigned limit) const = 0;
	};

}