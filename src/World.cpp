#include <Brise/World.h>

#include <algorithm>

namespace Brise {
	World::World(size_t maxParticles, unsigned maxContacts, float fixedTimeStep)
	: capacity(maxParticles), resolver(0), maxContacts(maxContacts), fixedDt(fixedTimeStep) {
		particles.reserve(capacity);
		contacts.resize(maxContacts);
		gravity = { 0, -9.81f, 0 }; // Default to real world gravity acceleration
	}

	void World::Update(float deltaTime) {
		accumulator += deltaTime;

		while (accumulator >= fixedDt)
		{
			Step(fixedDt);
			accumulator -= fixedDt;
		}

	}

	void World::Step(float fixedDt) {
		// Apply the force generators
		forceRegistry.UpdateForces(fixedDt);

		// Integrate the particles
		for (auto& p : particles) {
			p.Integrate(fixedDt);
		}

		// Generate Contacts
		unsigned usedContacts = GenerateContacts();

		// Process the contacts
		if (usedContacts) {
			resolver.SetIterations(usedContacts);
			resolver.ResolveContacts(contacts, usedContacts, fixedDt);
		}
	}

	Particle* World::AddParticle(Vec3 position, float mass, float damping, float radius) {
		if (particles.size() >= capacity) return nullptr;

		particles.push_back(Particle(position, mass, damping, radius));
		particles.back().acceleration = gravity; // Set world gravity as constant acceleration

		return &particles.back();
	}

	const World::ParticleContainer& World::GetParticles() const {
		return particles;
	}

	size_t World::GetCapacity() const {
		return capacity;
	}

	ParticleForceGenerator& World::AddForceGenerator(std::unique_ptr<ParticleForceGenerator> fg) {
		forceGenerators.push_back(std::move(fg));
		return *forceGenerators.back();
	}

	void World::AddForceGenToRegistry(Particle* particle, ParticleForceGenerator* fg) {
		forceRegistry.Add(particle, fg);
	}

	LinkId World::AddLink(std::unique_ptr<ParticleLink> link) {
		LinkId id = nextLinkId++;
		links.push_back({ id, std::move(link) });
		return id;
	}

	void World::RemoveLink(LinkId id) {
		links.erase(
			std::remove_if(
				links.begin(),
				links.end(),
				[id](const LinkEntry& entry) { return entry.id == id; }),
			links.end()
		);
	}

	unsigned World::GenerateContacts() {
		unsigned limit = maxContacts;
		unsigned nextContact = 0;

		for (const auto& entry : links) {
			if (nextContact >= limit)
				break;

			unsigned used = entry.link->AddContact(
				contacts[nextContact],
				limit - nextContact
			);

			nextContact += used;
		}

		return nextContact;
	}
}
