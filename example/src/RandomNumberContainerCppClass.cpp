#include <emscripten/bind.h>
#include <time.h>

using namespace emscripten;

class RandomNumberContainerCppClass {
public:
  RandomNumberContainerCppClass(int x)
    : number(x)
  {}
  RandomNumberContainerCppClass()
  {
    srand (time(NULL));
    roll();
  }
  int getNumber() const { return number; }
  void setNumber(int x_) { number = x_; }

  void roll() {
    number = rand();
  }

private:
  int number;
};


EMSCRIPTEN_BINDINGS(RandomNumberContainerCppClassBinding) {
  class_<RandomNumberContainerCppClass>("RandomNumberContainerCppClass")
    .constructor<int>()
    .constructor<>()
    .function("getNumber", &RandomNumberContainerCppClass::getNumber)
    .property("number", &RandomNumberContainerCppClass::getNumber, &RandomNumberContainerCppClass::setNumber)
    ;
}
