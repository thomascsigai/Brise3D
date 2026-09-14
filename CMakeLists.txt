cmake_minimum_required(VERSION 3.16)

project(
	Brise3D
	LANGUAGES C CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Change option here if you want to build or not the tests by default
option(BRISE_BUILD_TESTS "Build the Brise unit tests" ON)

# PForceGen, PContact, PLinks and World are still the 2D sources (see #2);
# they join the library once translated to Vec3.
add_library(
	brise STATIC
	src/Particle.cpp
	src/Vec3.cpp
)

target_include_directories(brise PUBLIC ${PROJECT_SOURCE_DIR}/include)

if (BRISE_BUILD_TESTS)
	enable_testing()
	add_subdirectory(tests)
endif()
