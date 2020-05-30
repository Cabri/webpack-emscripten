#include <emscripten/bind.h>

using namespace emscripten;
class NumberContainerCppClass {
public:
  NumberContainerCppClass()
  {}

  int getNumber() const { return number; }
  void setNumber(int num) { number = num; }

private:
  int number;
};

// Binding code
EMSCRIPTEN_BINDINGS(NumberContainerCppClassBinding) {
  class_<NumberContainerCppClass>("NumberContainerCppClass")
    .constructor<>()
    .function("getNumber", &NumberContainerCppClass::getNumber)
    .property("number", &NumberContainerCppClass::getNumber, &NumberContainerCppClass::setNumber)
    ;
}
