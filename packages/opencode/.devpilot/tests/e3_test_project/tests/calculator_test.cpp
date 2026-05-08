#include <gtest/gtest.h>
#include "../src/calculator.h"

TEST(CalculatorTest, Add) {
    Calculator calc;
    EXPECT_EQ(calc.add(1, 2), 3);
}

TEST(CalculatorTest, Subtract) {
    Calculator calc;
    EXPECT_EQ(calc.subtract(5, 3), 2);
}
