#include <emscripten/bind.h>
#include <stdio.h>

using namespace emscripten;
class NumberContainerCppClass {
public:
  NumberContainerCppClass()
  {}

  int getNumber() const { return number; }
  void setNumber(int num) { number = num; }

  void showTheNumber() {
    char str[20];
    puts("Hello there,");
    puts("This is in several lines...");
    sprintf(str, "%d", number);
    puts(str);
    puts("... so we can see things unroll and enjoy debugging...");
    sprintf(str, "%d", number++);
    puts(str);
    puts("... bye...");
  }

private:
  int number;
};

// Binding code
EMSCRIPTEN_BINDINGS(NumberContainerCppClassBinding) {
  class_<NumberContainerCppClass>("NumberContainerCppClass")
    .constructor<>()
    .function("getNumber", &NumberContainerCppClass::getNumber)
    .function("showTheNumber", &NumberContainerCppClass::showTheNumber)
    .property("number", &NumberContainerCppClass::getNumber, &NumberContainerCppClass::setNumber)
    ;
}
