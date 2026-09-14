#pragma once

#include <Brise/PContact.h>
#include <Brise/Particle.h>

#include <vector>

namespace Brise {

	// Keeps every particle above the horizontal plane at height y.
	// Emits one contact with the scenery per particle that dips below the
	// plane by its radius. Holds a pointer to the container it examines.
	class GroundPlane : public ParticleContactGenerator {
	public:
		float y;
		float restitution;

	private:
		std::vector<Particle>* particles;

	public:
		GroundPlane(std::vector<Particle>* particles, float y, float restitution);

		virtual unsigned AddContact(ParticleContact* contact, unsigned limit) const override;
	};

	// Emits a contact for every pair of particles closer than the sum of their
	// radii. Tests every pair: O(n^2), no broadphase, by design.
	class ParticleCollision : public ParticleContactGenerator {
	public:
		float restitution;

	private:
		std::vector<Particle>* particles;

	public:
		ParticleCollision(std::vector<Particle>* particles, float restitution);

		virtual unsigned AddContact(ParticleContact* contact, unsigned limit) const override;
	};

}
