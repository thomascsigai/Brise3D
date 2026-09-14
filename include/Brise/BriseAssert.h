#pragma once

#include <iostream>

#if defined(_MSC_VER)
#define BR_DEBUGBREAK() __debugbreak()
#else
#define BR_DEBUGBREAK() __builtin_trap()
#endif

#define BR_ASSERT(expr) \
	if (expr) { } \
	else \
	{ \
		std::cerr << "Assertion not passed." << std::endl; \
		BR_DEBUGBREAK(); \
	}
