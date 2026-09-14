#pragma once

#include <iostream>

#define BR_ASSERT(expr) \
	if (expr) { } \
	else \
	{ \
		std::cerr << "Assertion not passed." << std::endl; \
		__debugbreak(); \
	}
