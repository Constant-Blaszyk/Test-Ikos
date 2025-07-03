from typing import TypedDict, List

class TestStep(TypedDict):
    description: str
    status: str
    result: str

def create_test_step(description: str, status: str, result: str) -> TestStep:
    return {
        "description": description,
        "status": status,
        "result": result
    }