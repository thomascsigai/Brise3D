#include <Brise/World.h>

#include <vector>

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
			// Resolving one contact can wake its neighbours (a stack), so
			// budget two passes over the contacts.
			resolver.SetIterations(usedContacts * 2);
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

	ParticleForceGenerator* World::AddForceGenerator(std::unique_ptr<ParticleForceGenerator> fg) {
		forceGenerators.push_back(std::move(fg));
		return forceGenerators.back().get();
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
		std::erase_if(links, [id](const LinkEntry& entry) { return entry.id == id; });
	}

	void World::AddGroundPlane(float y, float restitution) {
		groundPlanes.emplace_back(&particles, y, restitution);
	}

	void World::EnableParticleCollisions(float restitution) {
		particleCollision.emplace(&particles, restitution);
	}

	unsigned World::GenerateContacts() {
		unsigned nextContact = 0;

		for (const auto& entry : links) {
			RunContactGenerator(*entry.link, nextContact);
		}
		for (const auto& ground : groundPlanes) {
			RunContactGenerator(ground, nextContact);
		}
		if (particleCollision) {
			RunContactGenerator(*particleCollision, nextContact);
		}

		return nextContact;
	}

	void World::RunContactGenerator(const ParticleContactGenerator& generator, unsigned& nextContact) {
		if (nextContact >= maxContacts) return;

		nextContact += generator.AddContact(
			&contacts[nextContact],
			maxContacts - nextContact
		);
	}
}
