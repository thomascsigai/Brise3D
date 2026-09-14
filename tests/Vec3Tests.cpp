#include <doctest/doctest.h>
#include <Brise/Vec3.h>

using Brise::Vec3;

TEST_CASE("Vec3 components are accessible by name and by index")
{
	Vec3 v(1.0f, 2.0f, 3.0f);

	CHECK(v.x == 1.0f);
	CHECK(v.y == 2.0f);
	CHECK(v.z == 3.0f);
	CHECK(v[0] == 1.0f);
	CHECK(v[1] == 2.0f);
	CHECK(v[2] == 3.0f);

	v[2] = 7.0f;
	CHECK(v.z == 7.0f);
}

TEST_CASE("Vec3 addition and subtraction are component-wise")
{
	Vec3 a(1.0f, 2.0f, 3.0f);
	Vec3 b(10.0f, 20.0f, 30.0f);

	Vec3 sum = a + b;
	CHECK(sum.x == 11.0f);
	CHECK(sum.y == 22.0f);
	CHECK(sum.z == 33.0f);

	Vec3 diff = b - a;
	CHECK(diff.x == 9.0f);
	CHECK(diff.y == 18.0f);
	CHECK(diff.z == 27.0f);

	a += b;
	CHECK(a.x == 11.0f);
	CHECK(a.y == 22.0f);
	CHECK(a.z == 33.0f);

	a -= b;
	CHECK(a.x == 1.0f);
	CHECK(a.y == 2.0f);
	CHECK(a.z == 3.0f);
}

TEST_CASE("Vec3 scalar multiplication, division and negation")
{
	Vec3 v(1.0f, -2.0f, 4.0f);

	Vec3 scaled = v * 2.0f;
	CHECK(scaled.x == 2.0f);
	CHECK(scaled.y == -4.0f);
	CHECK(scaled.z == 8.0f);

	Vec3 halved = v / 2.0f;
	CHECK(halved.x == 0.5f);
	CHECK(halved.y == -1.0f);
	CHECK(halved.z == 2.0f);

	Vec3 neg = -v;
	CHECK(neg.x == -1.0f);
	CHECK(neg.y == 2.0f);
	CHECK(neg.z == -4.0f);

	v *= 3.0f;
	CHECK(v.x == 3.0f);
	CHECK(v.y == -6.0f);
	CHECK(v.z == 12.0f);

	v /= 3.0f;
	CHECK(v.x == 1.0f);
	CHECK(v.y == -2.0f);
	CHECK(v.z == 4.0f);
}

TEST_CASE("Vec3 magnitude and distance")
{
	CHECK(Brise::Magnitude(Vec3(2.0f, 3.0f, 6.0f)) == doctest::Approx(7.0f));
	CHECK(Brise::Magnitude(Vec3(0.0f, 0.0f, 0.0f)) == 0.0f);

	CHECK(Brise::DistanceSquared(Vec3(1.0f, 1.0f, 1.0f), Vec3(3.0f, 4.0f, 7.0f)) == doctest::Approx(49.0f));
}

TEST_CASE("Vec3 normalize yields a unit vector in the same direction")
{
	Vec3 n = Brise::Normalize(Vec3(0.0f, 3.0f, 4.0f));

	CHECK(n.x == doctest::Approx(0.0f));
	CHECK(n.y == doctest::Approx(0.6f));
	CHECK(n.z == doctest::Approx(0.8f));
	CHECK(Brise::Magnitude(n) == doctest::Approx(1.0f));
}

TEST_CASE("Vec3 dot product")
{
	CHECK(Brise::Dot(Vec3(1.0f, 2.0f, 3.0f), Vec3(4.0f, -5.0f, 6.0f)) == doctest::Approx(12.0f));
	CHECK(Brise::Dot(Vec3(1.0f, 0.0f, 0.0f), Vec3(0.0f, 1.0f, 0.0f)) == 0.0f);
	CHECK(Brise::Dot(Vec3(0.0f, 1.0f, 0.0f), Vec3(0.0f, 1.0f, 0.0f)) == 1.0f);
}

TEST_CASE("Vec3 cross product is right-handed")
{
	Vec3 xAxis(1.0f, 0.0f, 0.0f);
	Vec3 yAxis(0.0f, 1.0f, 0.0f);
	Vec3 zAxis(0.0f, 0.0f, 1.0f);

	Vec3 xy = Brise::Cross(xAxis, yAxis);
	CHECK(xy.x == 0.0f);
	CHECK(xy.y == 0.0f);
	CHECK(xy.z == 1.0f);

	Vec3 yz = Brise::Cross(yAxis, zAxis);
	CHECK(yz.x == 1.0f);
	CHECK(yz.y == 0.0f);
	CHECK(yz.z == 0.0f);

	Vec3 zx = Brise::Cross(zAxis, xAxis);
	CHECK(zx.x == 0.0f);
	CHECK(zx.y == 1.0f);
	CHECK(zx.z == 0.0f);

	// Anti-commutative
	Vec3 yx = Brise::Cross(yAxis, xAxis);
	CHECK(yx.z == -1.0f);

	// Parallel vectors give the zero vector
	Vec3 parallel = Brise::Cross(Vec3(2.0f, 4.0f, 6.0f), Vec3(1.0f, 2.0f, 3.0f));
	CHECK(parallel.x == 0.0f);
	CHECK(parallel.y == 0.0f);
	CHECK(parallel.z == 0.0f);

	// Result is orthogonal to both operands
	Vec3 a(1.0f, 2.0f, 3.0f);
	Vec3 b(-4.0f, 5.0f, 0.5f);
	Vec3 c = Brise::Cross(a, b);
	CHECK(Brise::Dot(c, a) == doctest::Approx(0.0f));
	CHECK(Brise::Dot(c, b) == doctest::Approx(0.0f));
}

TEST_CASE("Vec3 projection and rejection split a vector along an axis")
{
	Vec3 v(3.0f, 4.0f, 5.0f);
	Vec3 axis(0.0f, 2.0f, 0.0f);

	Vec3 proj = Brise::Project(v, axis);
	CHECK(proj.x == doctest::Approx(0.0f));
	CHECK(proj.y == doctest::Approx(4.0f));
	CHECK(proj.z == doctest::Approx(0.0f));

	Vec3 rej = Brise::Reject(v, axis);
	CHECK(rej.x == doctest::Approx(3.0f));
	CHECK(rej.y == doctest::Approx(0.0f));
	CHECK(rej.z == doctest::Approx(5.0f));
}

TEST_CASE("Vec3 ToString and stream output list the three components")
{
	Vec3 v(1.0f, 2.5f, -3.0f);
	CHECK(v.ToString() == "(1, 2.5, -3)");

	std::ostringstream oss;
	oss << v;
	CHECK(oss.str() == "(1, 2.5, -3)");
}
