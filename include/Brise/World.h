#pragma once

#include <Brise/Particle.h>
#include <Brise/PForceGen.h>
#include <Brise/PContact.h>
#include <Brise/PLinks.h>
#include <memory>
#include <vector>

namespace Brise {

	// Identifies a link for the life of the world; never reused after removal.
	using LinkId = unsigned;

	class World {

	public:
		using ParticleContainer = std::vector<Particle>;
		using ParticleContacts = std::vector<ParticleContact>;

	private:
		struct LinkEntry {
			LinkId id;
			std::unique_ptr<ParticleLink> link;
		};

		ParticleContainer particles;
		size_t capacity;

		std::vector<std::unique_ptr<ParticleForceGenerator>> forceGenerators;
		ParticleForceRegistry forceRegistry;

		std::vector<LinkEntry> links;
		LinkId nextLinkId = 0;

		ParticleContacts contacts;
		ParticleContactResolver resolver;
		unsigned maxContacts;

		Vec3 gravity; // World gravity acceleration

		float fixedDt;
		float accumulator = 0;

	public:

		// The world holds at most maxParticles particles and resolves at most
		// maxContacts contacts per step. Both are fixed for the life of the world.
		World(size_t maxParticles, unsigned maxContacts, float fixedTimeStep = 1.0f / 120.0f);

		void Update(float deltaTime);

		// Returns nullptr once the world is at capacity. Particles are never
		// removed, so the returned pointer stays valid for the life of the world.
		Particle* AddParticle(Vec3 position, float mass, float damping, float radius);
		const ParticleContainer& GetParticles() const;
		size_t GetCapacity() const;

		// The world takes ownership of the generator; register it to particles
		// with AddForceGenToRegistry.
		ParticleForceGenerator* AddForceGenerator(std::unique_ptr<ParticleForceGenerator> fg);
		void AddForceGenToRegistry(Particle* particle, ParticleForceGenerator* fg);

		// The world takes ownership of the link and returns its id.
		LinkId AddLink(std::unique_ptr<ParticleLink> link);
		void RemoveLink(LinkId id);

	private:
		void Step(float fixedDt);

		unsigned GenerateContacts();
	};

}
