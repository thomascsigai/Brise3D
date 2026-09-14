#pragma once 

#include <cmath>
#include <iostream>
#include <string>
#include <sstream>

namespace Brise
{
	// Y-up, right-handed, metres.
	struct Vec3
	{
		float x, y, z;

		Vec3() = default;

		Vec3(float _x, float _y, float _z)
			: x(_x), y(_y), z(_z) {
		}

		std::string ToString() const;

		// Operators overloads ------------------

		// Access components by index
		float& operator [](int i);
		const float& operator [](int i) const;

		// Scalar multiplication
		Vec3& operator /=(float s);
		Vec3& operator *=(float s);

		// Addition & substraction
		Vec3& operator +=(const Vec3& v);
		Vec3& operator -=(const Vec3& v);
	};

	// Vec3 operations functions
	inline Vec3 operator *(const Vec3& v, float s)
	{
		return (Vec3(v.x * s, v.y * s, v.z * s));
	}

	inline Vec3 operator /(const Vec3& v, float s)
	{
		s = 1.0f / s;
		return (Vec3(v.x * s, v.y * s, v.z * s));
	}

	inline Vec3 operator -(const Vec3& v)
	{
		return (Vec3(-v.x, -v.y, -v.z));
	}

	inline float Magnitude(const Vec3& v)
	{
		return (std::sqrt(v.x * v.x + v.y * v.y + v.z * v.z));
	}

	inline Vec3 Normalize(const Vec3& v)
	{
		return (v / Magnitude(v));
	}

	inline Vec3 operator+(const Vec3& v1, const Vec3& v2)
	{
		return (Vec3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z));
	}
	
	inline Vec3 operator-(const Vec3& v1, const Vec3& v2)
	{
		return (Vec3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z));
	}

	inline float Dot(const Vec3& v1, const Vec3& v2)
	{
		return (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z);
	}

	// Right-handed: Cross(x, y) == z
	inline Vec3 Cross(const Vec3& v1, const Vec3& v2)
	{
		return (Vec3(
			v1.y * v2.z - v1.z * v2.y,
			v1.z * v2.x - v1.x * v2.z,
			v1.x * v2.y - v1.y * v2.x));
	}

	inline Vec3 Project(const Vec3& v1, const Vec3& v2)
	{
		return (v2 * (Dot(v1, v2) / Dot(v2, v2)));
	}

	inline Vec3 Reject(const Vec3& v1, const Vec3& v2)
	{
		return (v1 - v2 * (Dot(v1, v2) / Dot(v2, v2)));
	}

	inline float DistanceSquared(const Vec3& v1, const Vec3& v2)
	{
		Vec3 d = v2 - v1;
		return (Dot(d, d));
	}
	
	// << operator overload to output vector components
	std::ostream& operator<<(std::ostream& os, const Vec3& v);
}
