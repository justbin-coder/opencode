#include <gtest/gtest.h>
#include "../src/nonexistent.h"

TEST(CalculatorTest, Add) {
    Calculator calc;
    EXPECT_EQ(calc.add(1, 2), 3);
}
