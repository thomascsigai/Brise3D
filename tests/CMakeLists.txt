include(FetchContent)

FetchContent_Declare(
	doctest
	GIT_REPOSITORY https://github.com/doctest/doctest.git
	GIT_TAG v2.4.12
)
FetchContent_MakeAvailable(doctest)

add_executable(
	brise_tests
	main.cpp
	Vec3Tests.cpp
	ParticleTests.cpp
	ForceGenTests.cpp
	ContactTests.cpp
)

target_link_libraries(brise_tests PRIVATE brise doctest::doctest)

include(${doctest_SOURCE_DIR}/scripts/cmake/doctest.cmake)
doctest_discover_tests(brise_tests)
