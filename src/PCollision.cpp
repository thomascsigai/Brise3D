#include <Brise/PCollision.h>

#include <cmath>

namespace Brise {
	GroundPlane::GroundPlane(std::vector<Particle>* particles, float y, float restitution)
		: y(y), restitution(restitution), particles(particles) {}

	unsigned GroundPlane::AddContact(ParticleContact* contact, unsigned limit) const {
		unsigned count = 0;

		for (auto& p : *particles) {
			if (count >= limit) break;

			float penetration = y + p.radius - p.position.y;
			if (penetration <= 0) continue;

			contact->particle[0] = &p;
			contact->particle[1] = nullptr;
			contact->contactNormal = { 0, 1, 0 };
			contact->penetration = penetration;
			contact->restitution = restitution;

			contact++;
			count++;
		}

		return count;
	}

	ParticleCollision::ParticleCollision(std::vector<Particle>* particles, float restitution)
		: restitution(restitution), particles(particles) {}

	unsigned ParticleCollision::AddContact(ParticleContact* contact, unsigned limit) const {
		unsigned count = 0;
		auto& ps = *particles;

		for (size_t i = 0; i < ps.size(); i++) {
			for (size_t j = i + 1; j < ps.size(); j++) {
				if (count >= limit) return count;

				Particle& a = ps[i];
				Particle& b = ps[j];

				Vec3 delta = a.position - b.position;
				float minDistance = a.radius + b.radius;
				float distanceSquared = Dot(delta, delta);
				if (distanceSquared >= minDistance * minDistance) continue;

				float distance = std::sqrt(distanceSquared);

				contact->particle[0] = &a;
				contact->particle[1] = &b;
				// Normal points from b towards a: the direction a moves to separate.
				// Coincident particles have no direction; push them apart along y.
				contact->contactNormal = distance > 0 ? delta / distance : Vec3(0, 1, 0);
				contact->penetration = minDistance - distance;
				contact->restitution = restitution;

				contact++;
				count++;
			}
		}

		return count;
	}
}
