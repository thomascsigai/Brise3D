#pragma once

#include <Brise/Vec3.h>

namespace Brise {
	class Particle {

	public:

		Vec3 position;
		Vec3 velocity;
		Vec3 acceleration;

		// Used only for contact generation and rendering; plays no role in forces or integration.
		float radius;
		
	private:

		float inverseMass;
		float damping;
		Vec3 forceAccum;

	public:

		Particle(Vec3 _pos, float mass, float damping, float radius);

		void Integrate(float dt);

		void AddForce(const Vec3& force);
		void ClearAccumulator();
		
		void SetMass(float value);
		void SetInfiniteMass();
		float GetMass() const;
		float GetInverseMass() const;
		bool HasFiniteMass();

		void SetDamping(float value);

	};
}
