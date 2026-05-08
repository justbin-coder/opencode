find_package(GTest REQUIRED)
add_executable(calculator_test calculator_test.cpp ../src/calculator.cpp)
target_link_libraries(calculator_test GTest::gtest_main)
