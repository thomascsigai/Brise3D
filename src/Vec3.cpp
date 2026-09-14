#include <Brise/Vec3.h>

namespace Brise
{
	float& Vec3::operator[](int i)
	{
		return ((&x)[i]);
	}

	const float& Vec3::operator[](int i) const
	{
		return ((&x)[i]);
	}

	Vec3& Vec3::operator *=(float s)
	{
		x *= s; y *= s; z *= s;
		return (*this);
	}
	
	Vec3& Vec3::operator /=(float s)
	{
		x /= s; y /= s; z /= s;
		return (*this);
	}

	Vec3& Vec3::operator +=(const Vec3& v)
	{
		x += v.x; y += v.y; z += v.z;
		return (*this);
	}

	Vec3& Vec3::operator -=(const Vec3& v)
	{
		x -= v.x; y -= v.y; z -= v.z;
		return (*this);
	}

	std::ostream& operator<<(std::ostream& os, const Vec3& v)
	{
		os << "(" << v[0] << ", " << v[1] << ", " << v[2] << ")";
		return os;
	}
	
	std::string Vec3::ToString() const
	{
		std::ostringstream oss;
		oss << *this;
		return oss.str();
	}
}
