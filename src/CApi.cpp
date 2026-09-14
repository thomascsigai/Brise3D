#include <Brise/CApi.h>
#include <Brise/World.h>

#include <memory>
#include <vector>

// The world plus the contiguous buffers the viewer reads each frame. Both
// buffers are sized to the capacity at creation so their pointers never move.
struct BriseWorld {
	Brise::World world;
	// Particle index -> particle; the world never removes particles, so the
	// pointers stay valid for its whole life.
	std::vector<Brise::Particle*> particles;
	std::vector<float> positions;
	std::vector<float> radii;

	BriseWorld(size_t maxParticles, unsigned maxContacts)
	: world(maxParticles, maxContacts), positions(3 * maxParticles, 0.0f), radii(maxParticles, 0.0f) {
		particles.reserve(maxParticles);
	}

	// nullptr for an index that was never handed out.
	Brise::Particle* ParticleAt(int index) const {
		if (index < 0 || static_cast<size_t>(index) >= particles.size()) return nullptr;
		return particles[index];
	}

	// The world owns the generator; register it to the particle.
	void Register(Brise::Particle* particle, std::unique_ptr<Brise::ParticleForceGenerator> fg) {
		world.AddForceGenToRegistry(particle, world.AddForceGenerator(std::move(fg)));
	}

	void WritePosition(int index) {
		const Brise::Vec3& p = particles[index]->position;
		positions[3 * index + 0] = p.x;
		positions[3 * index + 1] = p.y;
		positions[3 * index + 2] = p.z;
	}
};

extern "C" {

	BriseWorld* world_create(int maxParticles, int maxContacts) {
		if (maxParticles < 0 || maxContacts < 0) return nullptr;

		return new BriseWorld(static_cast<size_t>(maxParticles), static_cast<unsigned>(maxContacts));
	}

	void world_destroy(BriseWorld* world) {
		delete world;
	}

	void world_update(BriseWorld* world, float dt) {
		world->world.Update(dt);

		for (int i = 0; i < world_particle_count(world); i++) {
			world->WritePosition(i);
		}
	}

	int world_add_particle(BriseWorld* world, float x, float y, float z, float mass, float damping, float radius) {
		// The particle constructor rejects a non-positive mass, so create it
		// with a placeholder mass and make it infinite afterwards.
		bool infiniteMass = mass <= 0.0f;
		Brise::Particle* particle = world->world.AddParticle({ x, y, z }, infiniteMass ? 1.0f : mass, damping, radius);
		if (!particle) return -1;
		if (infiniteMass) particle->SetInfiniteMass();

		world->particles.push_back(particle);
		int index = world_particle_count(world) - 1;
		world->WritePosition(index);
		world->radii[index] = radius;

		return index;
	}

	int world_particle_count(const BriseWorld* world) {
		return static_cast<int>(world->particles.size());
	}

	void world_set_velocity(BriseWorld* world, int index, float x, float y, float z) {
		if (Brise::Particle* p = world->ParticleAt(index)) p->velocity = { x, y, z };
	}

	void world_set_acceleration(BriseWorld* world, int index, float x, float y, float z) {
		if (Brise::Particle* p = world->ParticleAt(index)) p->acceleration = { x, y, z };
	}

	void world_add_gravity(BriseWorld* world, int i, float gx, float gy, float gz) {
		Brise::Particle* p = world->ParticleAt(i);
		if (!p) return;

		world->Register(p, std::make_unique<Brise::ParticleGravity>(Brise::Vec3(gx, gy, gz)));
	}

	void world_add_spring(BriseWorld* world, int i, int j, float springConstant, float restLength) {
		Brise::Particle* a = world->ParticleAt(i);
		Brise::Particle* b = world->ParticleAt(j);
		if (!a || !b) return;

		world->Register(a, std::make_unique<Brise::ParticleSpring>(b, springConstant, restLength));
		world->Register(b, std::make_unique<Brise::ParticleSpring>(a, springConstant, restLength));
	}

	void world_add_anchored_spring(BriseWorld* world, int i, float ax, float ay, float az, float springConstant, float restLength) {
		Brise::Particle* p = world->ParticleAt(i);
		if (!p) return;

		world->Register(p, std::make_unique<Brise::AnchoredParticleSpring>(Brise::Vec3(ax, ay, az), springConstant, restLength));
	}

	void world_add_bungee(BriseWorld* world, int i, int j, float springConstant, float restLength) {
		Brise::Particle* a = world->ParticleAt(i);
		Brise::Particle* b = world->ParticleAt(j);
		if (!a || !b) return;

		world->Register(a, std::make_unique<Brise::ParticleBungee>(b, springConstant, restLength));
		world->Register(b, std::make_unique<Brise::ParticleBungee>(a, springConstant, restLength));
	}

	void world_add_buoyancy(BriseWorld* world, int i, float maxDepth, float volume, float waterHeight, float liquidDensity) {
		Brise::Particle* p = world->ParticleAt(i);
		if (!p) return;

		world->Register(p, std::make_unique<Brise::ParticleBuoyancy>(maxDepth, volume, waterHeight, liquidDensity));
	}

	int world_add_rod(BriseWorld* world, int i, int j, float length) {
		Brise::Particle* a = world->ParticleAt(i);
		Brise::Particle* b = world->ParticleAt(j);
		if (!a || !b) return -1;

		return static_cast<int>(world->world.AddLink(std::make_unique<Brise::ParticleRod>(a, b, length)));
	}

	int world_add_cable(BriseWorld* world, int i, int j, float maxLength, float restitution) {
		Brise::Particle* a = world->ParticleAt(i);
		Brise::Particle* b = world->ParticleAt(j);
		if (!a || !b) return -1;

		return static_cast<int>(world->world.AddLink(std::make_unique<Brise::ParticleCable>(a, b, maxLength, restitution)));
	}

	void world_remove_link(BriseWorld* world, int id) {
		if (id < 0) return;
		world->world.RemoveLink(static_cast<Brise::LinkId>(id));
	}

	void world_add_ground_plane(BriseWorld* world, float y, float restitution) {
		world->world.AddGroundPlane(y, restitution);
	}

	void world_enable_particle_collisions(BriseWorld* world, float restitution) {
		world->world.EnableParticleCollisions(restitution);
	}

	int world_last_steps(const BriseWorld* world) {
		return static_cast<int>(world->world.GetLastSteps());
	}

	int world_last_contacts(const BriseWorld* world) {
		return static_cast<int>(world->world.GetLastContacts());
	}

	int world_last_iterations_used(const BriseWorld* world) {
		return static_cast<int>(world->world.GetLastIterationsUsed());
	}

	int world_last_iterations(const BriseWorld* world) {
		return static_cast<int>(world->world.GetLastIterations());
	}

	const float* world_positions_ptr(const BriseWorld* world) {
		return world->positions.data();
	}

	const float* world_radii_ptr(const BriseWorld* world) {
		return world->radii.data();
	}

}
