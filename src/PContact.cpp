#include <Brise/PContact.h>

namespace Brise {
	void ParticleContact::Resolve(float duration) {
		ResolveVelocity(duration);
		ResolveInterpenetration(duration);
	}

	float ParticleContact::CalculateSeparatingVelocity() const {
		Vec3 relativeVelocity = particle[0]->velocity;
		if (particle[1]) relativeVelocity -= particle[1]->velocity;
		return Dot(relativeVelocity, contactNormal);
	}

	void ParticleContact::ResolveVelocity(float duration) {
		float separatingVelocity = CalculateSeparatingVelocity();

		// Checks if particles are separating
		if (separatingVelocity > 0) return; // no impulse required

		// Calculate new separating velocity
		float newSepVelocity = -separatingVelocity * restitution;

		// Checks the velocity buildup due to acceleration only
		Vec3 accCausedVelocity = particle[0]->acceleration;
		if (particle[1]) accCausedVelocity -= particle[1]->acceleration;
		float accCausedSepVelocity = Dot(accCausedVelocity, contactNormal) * duration;

		// If ther's closing vel due to acceleration buildup, remove it
		if (accCausedSepVelocity < 0) {
			newSepVelocity += restitution * accCausedSepVelocity;

			if (newSepVelocity < 0) newSepVelocity = 0;
		}

		float deltaVelocity = newSepVelocity - separatingVelocity;

		// Apply the change in proportion of the inverseMass
		float totalInverseMass = particle[0]->GetInverseMass();
		if (particle[1]) totalInverseMass += particle[1]->GetInverseMass();

		// Checks if both particles have infiniteMass
		if (totalInverseMass <= 0) return;

		// Calculate the impulse
		float impulse = deltaVelocity / totalInverseMass;
		Vec3 impulsePerIMass = contactNormal * impulse;

		// Apply impulse
		particle[0]->velocity += impulsePerIMass * particle[0]->GetInverseMass();
		if (particle[1]) {
			particle[1]->velocity += impulsePerIMass * (-particle[1]->GetInverseMass());
		}
	}

	void ParticleContact::ResolveInterpenetration(float duration) {
		particleMovement[0] = { 0, 0, 0 };
		particleMovement[1] = { 0, 0, 0 };

		// Checks if no penetration
		if (penetration <= 0) return;

		// apply the change in proportion of the inverseMass
		float totalInverseMass = particle[0]->GetInverseMass();
		if (particle[1]) totalInverseMass += particle[1]->GetInverseMass();

		// Checks if both particles have infiniteMass
		if (totalInverseMass <= 0) return;

		// Calculate the movement amounts
		float percent = 0.8f;
		Vec3 movePerIMass = contactNormal * ((penetration * percent) / totalInverseMass);

		particleMovement[0] = movePerIMass * particle[0]->GetInverseMass();
		if (particle[1]) {
			particleMovement[1] = movePerIMass * (-particle[1]->GetInverseMass());
		}

		// Apply penetration resolution
		particle[0]->position += particleMovement[0];
		if (particle[1]) {
			particle[1]->position += particleMovement[1];
		}
	}

	ParticleContactResolver::ParticleContactResolver(unsigned iterations)
		: iterations(iterations) {
	}

	void ParticleContactResolver::SetIterations(unsigned iterations) {
		this->iterations = iterations;
	}

	void ParticleContactResolver::ResolveContacts(std::vector<ParticleContact>& contactArray, unsigned numContacts, float duration) {
		unsigned i;
		iterationsUsed = 0;

		while (iterationsUsed < iterations) {
			// Find contact with largest closing velocity
			float max = std::numeric_limits<float>::max();
			unsigned maxIndex = numContacts;
			for (i = 0; i < numContacts; i++) {
				float sepVel = contactArray[i].CalculateSeparatingVelocity();

				if (sepVel < max && (sepVel < 0 || contactArray[i].penetration > 0)) {
					max = sepVel;
					maxIndex = i;
				}
			}

			if (maxIndex == numContacts) break;
			contactArray[maxIndex].Resolve(duration);

			// The resolved contact moved its particles: update the penetration
			// of every other contact those particles are involved in
			const ParticleContact& resolved = contactArray[maxIndex];
			for (i = 0; i < numContacts; i++) {
				ParticleContact& c = contactArray[i];

				if (c.particle[0] == resolved.particle[0]) {
					c.penetration -= Dot(resolved.particleMovement[0], c.contactNormal);
				}
				else if (c.particle[0] == resolved.particle[1]) {
					c.penetration -= Dot(resolved.particleMovement[1], c.contactNormal);
				}

				if (c.particle[1]) {
					if (c.particle[1] == resolved.particle[0]) {
						c.penetration += Dot(resolved.particleMovement[0], c.contactNormal);
					}
					else if (c.particle[1] == resolved.particle[1]) {
						c.penetration += Dot(resolved.particleMovement[1], c.contactNormal);
					}
				}
			}

			iterationsUsed++;
		}
	}
}