#include <Brise/PLinks.h>

namespace Brise {
    ParticleLink::ParticleLink(Particle* a, Particle* b)
        : particle{ a, b } {}

    float ParticleLink::CurrentLength() const {
        Vec3 relativePos = particle[0]->position - particle[1]->position;
        return Magnitude(relativePos);
    }

    ParticleCable::ParticleCable(Particle* a, Particle* b, float maxLength, float restitution)
        : ParticleLink(a, b), maxLength(maxLength), restitution(restitution) {}

    unsigned ParticleCable::AddContact(ParticleContact& contact, unsigned limit) const {
        float length = CurrentLength();

        // Checks if we're overextended
        if (length < maxLength) return 0;

        // Otherwise, return the contact
        contact.particle[0] = particle[0];
        contact.particle[1] = particle[1];

        // Calculate the normal
        Vec3 normal = Normalize(particle[1]->position - particle[0]->position);
        contact.contactNormal = normal;
        contact.penetration = length - maxLength;
        contact.restitution = restitution;

        return 1;
    }

    ParticleRod::ParticleRod(Particle* a, Particle* b, float length)
        : ParticleLink(a, b), length(length) {}

    unsigned ParticleRod::AddContact(ParticleContact& contact, unsigned limit) const {
        float currentLength = CurrentLength();

        // Checks if overextended
        if (currentLength == length) return 0;

        // Otherwise, return the contact
        contact.particle[0] = particle[0];
        contact.particle[1] = particle[1];

        // Calculate the normal
        Vec3 normal = Normalize(particle[1]->position - particle[0]->position);

        // Contact normal depends on wheter we're extending or compressing
        if (currentLength > length) {
            contact.contactNormal = normal;
            contact.penetration = currentLength - length;
        }
        else {
            contact.contactNormal = normal * -1;
            contact.penetration = length - currentLength;
        }

        contact.restitution = 0;

        return 1;
    }
}