#pragma once

#include <Brise/Particle.h>
#include <Brise/PForceGen.h>
#include <Brise/PContact.h>
#include <Brise/PLinks.h>
#include <Brise/PCollision.h>
#include <memory>
#include <optional>
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

		std::vector<GroundPlane> groundPlanes;
		std::optional<ParticleCollision> particleCollision;

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

		// The contact generators point at this world's particle container,
		// so a world can be neither copied nor moved (deleting the copy
		// operations also suppresses the implicit move).
		World(const World&) = delete;
		World& operator=(const World&) = delete;

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

		// Keeps every particle above the plane at height y.
		void AddGroundPlane(float y, float restitution);
		// Off by default. Calling again only updates the restitution.
		void EnableParticleCollisions(float restitution);

	private:
		void Step(float fixedDt);

		unsigned GenerateContacts();
		// Appends the generator's contacts at nextContact, within maxContacts.
		void RunContactGenerator(const ParticleContactGenerator& generator, unsigned& nextContact);
	};

}
