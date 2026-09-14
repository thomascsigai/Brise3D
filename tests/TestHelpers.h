#pragma once

#include <doctest/doctest.h>
#include <Brise/Vec3.h>

inline void CheckVec(const Brise::Vec3& v, float x, float y, float z)
{
	CHECK(v.x == doctest::Approx(x));
	CHECK(v.y == doctest::Approx(y));
	CHECK(v.z == doctest::Approx(z));
}
