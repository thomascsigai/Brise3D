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

add_library(
	brise STATIC
	src/CApi.cpp
	src/Particle.cpp
	src/PCollision.cpp
	src/PContact.cpp
	src/PForceGen.cpp
	src/PLinks.cpp
	src/Vec3.cpp
	src/World.cpp
)

target_include_directories(brise PUBLIC ${PROJECT_SOURCE_DIR}/include)

# Native only: ctest cannot run a WebAssembly test binary.
if (BRISE_BUILD_TESTS AND NOT EMSCRIPTEN)
	enable_testing()
	add_subdirectory(tests)
endif()

# WebAssembly build for the web viewer: `emcmake cmake -B build-wasm`.
# Produces brise.js (ES module) + brise.wasm exposing the flat C API
# (include/Brise/CApi.h) and copies both to web/public/.
if (EMSCRIPTEN)
	set(BRISE_WASM_EXPORTS
		_world_create
		_world_destroy
		_world_update
		_world_add_particle
		_world_particle_count
		_world_set_velocity
		_world_set_acceleration
		_world_add_gravity
		_world_add_spring
		_world_add_anchored_spring
		_world_add_bungee
		_world_add_buoyancy
		_world_add_rod
		_world_add_cable
		_world_remove_link
		_world_add_ground_plane
		_world_enable_particle_collisions
		_world_last_steps
		_world_last_contacts
		_world_last_iterations_used
		_world_last_iterations
		_world_positions_ptr
		_world_radii_ptr
	)
	list(JOIN BRISE_WASM_EXPORTS "," BRISE_WASM_EXPORTS_ARG)

	# Link the library's objects directly so the C API is present regardless
	# of archive extraction rules.
	add_executable(brise_wasm $<TARGET_OBJECTS:brise>)
	set_target_properties(
		brise_wasm PROPERTIES
		OUTPUT_NAME brise
		SUFFIX ".js"
		LINKER_LANGUAGE CXX
	)
	target_link_options(
		brise_wasm PRIVATE
		-sMODULARIZE
		-sEXPORT_ES6
		-sENVIRONMENT=web
		"-sEXPORTED_FUNCTIONS=${BRISE_WASM_EXPORTS_ARG}"
		"-sEXPORTED_RUNTIME_METHODS=cwrap,HEAPF32"
	)

	set(BRISE_WEB_PUBLIC_DIR ${PROJECT_SOURCE_DIR}/web/public)
	add_custom_command(
		TARGET brise_wasm POST_BUILD
		COMMAND ${CMAKE_COMMAND} -E make_directory ${BRISE_WEB_PUBLIC_DIR}
		COMMAND ${CMAKE_COMMAND} -E copy_if_different
			$<TARGET_FILE:brise_wasm>
			$<TARGET_FILE_DIR:brise_wasm>/brise.wasm
			${BRISE_WEB_PUBLIC_DIR}
		COMMENT "Copying brise.js and brise.wasm to web/public/"
	)
endif()
