// GENERATED FILE. Do not edit by hand.
// Every number on the storyboard page is read from this data.
// It is the unmodified output of the VedicMath AI Python backend
// (GET /sutras/{sutra}/lesson), captured in-process with FastAPI's TestClient.
window.LESSON_DATA = {
  "capturedAt": "2026-11-13 23:54",
  "apiVersion": "0.4.0",
  "gitCommit": "ecf1111+uncommitted nikhilam change",
  "lessons": {
    "nikhilam": {
      "request": "GET /sutras/nikhilam/lesson?a=98&b=97&difficulty=beginner",
      "response": {
        "sutra": "nikhilam",
        "numbers": [
          98,
          97
        ],
        "difficulty": "beginner",
        "teaching_steps": [
          {
            "id": 1,
            "type": "base",
            "title": "Choose a base",
            "base": 100,
            "numbers": [
              98,
              97
            ],
            "right_digits": 2
          },
          {
            "id": 2,
            "type": "deviations",
            "title": "Calculate deviations",
            "convention": "base - number",
            "deviations": [
              2,
              3
            ],
            "calculations": [
              {
                "operand": "number_a",
                "target": "deviation_a",
                "base": 100,
                "number": 98,
                "deviation": 2
              },
              {
                "operand": "number_b",
                "target": "deviation_b",
                "base": 100,
                "number": 97,
                "deviation": 3
              }
            ]
          },
          {
            "id": 3,
            "type": "cross_subtract",
            "title": "Cross-subtract",
            "left_part": 95,
            "cross_calculations": [
              {
                "operand": "number_a",
                "deviation_operand": "deviation_b",
                "number": 98,
                "deviation": 3,
                "value": 95
              },
              {
                "operand": "number_b",
                "deviation_operand": "deviation_a",
                "number": 97,
                "deviation": 2,
                "value": 95
              }
            ]
          },
          {
            "id": 4,
            "type": "multiply_deviations",
            "title": "Multiply deviations",
            "deviations": [
              2,
              3
            ],
            "right_part": 6,
            "formatted_right": "06"
          },
          {
            "id": 5,
            "type": "combine",
            "title": "Combine the parts",
            "original_left": 95,
            "original_right": 6,
            "adjustment": "none",
            "carry": 0,
            "left_part": 95,
            "right_part": 6,
            "right_digits": 2,
            "padding_zeros": 1,
            "formatted_right": "06",
            "result": 9506
          }
        ],
        "animation_steps": [
          {
            "step_id": 1,
            "title": "Choose a base",
            "type": "base",
            "events": [
              {
                "action": "show_numbers",
                "number1": 98,
                "number2": 97,
                "operands": [
                  {
                    "id": "number_a",
                    "value": 98
                  },
                  {
                    "id": "number_b",
                    "value": 97
                  }
                ]
              },
              {
                "action": "show_base",
                "target": "base",
                "value": 100,
                "right_digits": 2
              },
              {
                "action": "compare_with_base",
                "base": "base",
                "operands": [
                  "number_a",
                  "number_b"
                ]
              }
            ]
          },
          {
            "step_id": 2,
            "title": "Calculate deviations",
            "type": "deviations",
            "events": [
              {
                "action": "calculate_deviation",
                "convention": "base - number",
                "operand": "number_a",
                "target": "deviation_a",
                "base": 100,
                "number": 98,
                "deviation": 2
              },
              {
                "action": "calculate_deviation",
                "convention": "base - number",
                "operand": "number_b",
                "target": "deviation_b",
                "base": 100,
                "number": 97,
                "deviation": 3
              }
            ]
          },
          {
            "step_id": 3,
            "title": "Cross-subtract",
            "type": "cross_subtract",
            "events": [
              {
                "action": "cross_subtract",
                "operand": "number_a",
                "deviation_operand": "deviation_b",
                "number": 98,
                "deviation": 3,
                "value": 95
              },
              {
                "action": "cross_subtract",
                "operand": "number_b",
                "deviation_operand": "deviation_a",
                "number": 97,
                "deviation": 2,
                "value": 95
              },
              {
                "action": "show_left_part",
                "target": "left_part",
                "value": 95,
                "sources": [
                  "number_a",
                  "number_b"
                ]
              }
            ]
          },
          {
            "step_id": 4,
            "title": "Multiply deviations",
            "type": "multiply_deviations",
            "events": [
              {
                "action": "multiply_deviations",
                "operands": [
                  "deviation_a",
                  "deviation_b"
                ],
                "values": [
                  2,
                  3
                ],
                "value": 6
              },
              {
                "action": "show_right_part",
                "target": "right_part",
                "value": 6
              }
            ]
          },
          {
            "step_id": 5,
            "title": "Combine the parts",
            "type": "combine",
            "events": [
              {
                "action": "pad_right_part",
                "target": "right_part",
                "value": 6,
                "right_digits": 2,
                "padding_zeros": 1,
                "formatted": "06"
              },
              {
                "action": "join_parts",
                "left_part": 95,
                "formatted_right": "06"
              },
              {
                "action": "reveal_result",
                "target": "result",
                "value": 9506
              }
            ]
          }
        ],
        "result": 9506
      }
    },
    "nikhilamBorrow": {
      "request": "GET /sutras/nikhilam/lesson?a=98&b=103&difficulty=beginner",
      "response": {
        "sutra": "nikhilam",
        "numbers": [
          98,
          103
        ],
        "difficulty": "beginner",
        "teaching_steps": [
          {
            "id": 1,
            "type": "base",
            "title": "Choose a base",
            "base": 100,
            "numbers": [
              98,
              103
            ],
            "right_digits": 2
          },
          {
            "id": 2,
            "type": "deviations",
            "title": "Calculate deviations",
            "convention": "base - number",
            "deviations": [
              2,
              -3
            ],
            "calculations": [
              {
                "operand": "number_a",
                "target": "deviation_a",
                "base": 100,
                "number": 98,
                "deviation": 2
              },
              {
                "operand": "number_b",
                "target": "deviation_b",
                "base": 100,
                "number": 103,
                "deviation": -3
              }
            ]
          },
          {
            "id": 3,
            "type": "cross_subtract",
            "title": "Cross-subtract",
            "left_part": 101,
            "cross_calculations": [
              {
                "operand": "number_a",
                "deviation_operand": "deviation_b",
                "number": 98,
                "deviation": -3,
                "value": 101
              },
              {
                "operand": "number_b",
                "deviation_operand": "deviation_a",
                "number": 103,
                "deviation": 2,
                "value": 101
              }
            ]
          },
          {
            "id": 4,
            "type": "multiply_deviations",
            "title": "Multiply deviations",
            "deviations": [
              2,
              -3
            ],
            "right_part": -6,
            "formatted_right": "-6"
          },
          {
            "id": 5,
            "type": "adjust",
            "title": "Borrow from the left part",
            "adjustment": "borrow",
            "carry": -1,
            "amount": 1,
            "base": 100,
            "left_before": 101,
            "left_after": 100,
            "right_before": -6,
            "right_after": 94,
            "right_change": 100
          },
          {
            "id": 6,
            "type": "combine",
            "title": "Combine the parts",
            "original_left": 101,
            "original_right": -6,
            "adjustment": "borrow",
            "carry": -1,
            "left_part": 100,
            "right_part": 94,
            "right_digits": 2,
            "padding_zeros": 0,
            "formatted_right": "94",
            "result": 10094
          }
        ],
        "animation_steps": [
          {
            "step_id": 1,
            "title": "Choose a base",
            "type": "base",
            "events": [
              {
                "action": "show_numbers",
                "number1": 98,
                "number2": 103,
                "operands": [
                  {
                    "id": "number_a",
                    "value": 98
                  },
                  {
                    "id": "number_b",
                    "value": 103
                  }
                ]
              },
              {
                "action": "show_base",
                "target": "base",
                "value": 100,
                "right_digits": 2
              },
              {
                "action": "compare_with_base",
                "base": "base",
                "operands": [
                  "number_a",
                  "number_b"
                ]
              }
            ]
          },
          {
            "step_id": 2,
            "title": "Calculate deviations",
            "type": "deviations",
            "events": [
              {
                "action": "calculate_deviation",
                "convention": "base - number",
                "operand": "number_a",
                "target": "deviation_a",
                "base": 100,
                "number": 98,
                "deviation": 2
              },
              {
                "action": "calculate_deviation",
                "convention": "base - number",
                "operand": "number_b",
                "target": "deviation_b",
                "base": 100,
                "number": 103,
                "deviation": -3
              }
            ]
          },
          {
            "step_id": 3,
            "title": "Cross-subtract",
            "type": "cross_subtract",
            "events": [
              {
                "action": "cross_subtract",
                "operand": "number_a",
                "deviation_operand": "deviation_b",
                "number": 98,
                "deviation": -3,
                "value": 101
              },
              {
                "action": "cross_subtract",
                "operand": "number_b",
                "deviation_operand": "deviation_a",
                "number": 103,
                "deviation": 2,
                "value": 101
              },
              {
                "action": "show_left_part",
                "target": "left_part",
                "value": 101,
                "sources": [
                  "number_a",
                  "number_b"
                ]
              }
            ]
          },
          {
            "step_id": 4,
            "title": "Multiply deviations",
            "type": "multiply_deviations",
            "events": [
              {
                "action": "multiply_deviations",
                "operands": [
                  "deviation_a",
                  "deviation_b"
                ],
                "values": [
                  2,
                  -3
                ],
                "value": -6
              },
              {
                "action": "show_right_part",
                "target": "right_part",
                "value": -6
              }
            ]
          },
          {
            "step_id": 5,
            "title": "Borrow from the left part",
            "type": "adjust",
            "events": [
              {
                "action": "adjust_parts",
                "adjustment": "borrow",
                "source": "left_part",
                "destination": "right_part",
                "amount": 1,
                "base": 100,
                "left_before": 101,
                "left_after": 100,
                "right_before": -6,
                "right_after": 94,
                "right_change": 100
              }
            ]
          },
          {
            "step_id": 6,
            "title": "Combine the parts",
            "type": "combine",
            "events": [
              {
                "action": "join_parts",
                "left_part": 100,
                "formatted_right": "94"
              },
              {
                "action": "reveal_result",
                "target": "result",
                "value": 10094
              }
            ]
          }
        ],
        "result": 10094
      }
    },
    "urdhva": {
      "request": "GET /sutras/urdhva/lesson?a=23&b=14&difficulty=beginner",
      "response": {
        "sutra": "urdhva",
        "numbers": [
          23,
          14
        ],
        "difficulty": "beginner",
        "teaching_steps": [
          {
            "id": 1,
            "type": "introduction",
            "title": "Understand Vertically and Crosswise",
            "numbers": [
              23,
              14
            ],
            "difficulty": "beginner"
          },
          {
            "id": 2,
            "type": "multiplication_column",
            "title": "Calculate column 1",
            "products": [
              {
                "digit_a": 3,
                "digit_b": 4,
                "position_a": 1,
                "position_b": 1,
                "product": 12
              }
            ],
            "subtotal": 12,
            "incoming_carry": 0,
            "total": 12,
            "write_digit": 2,
            "outgoing_carry": 1,
            "animation_events": [
              {
                "action": "highlight_and_connect",
                "position_a": 1,
                "position_b": 1,
                "digit_a": 3,
                "digit_b": 4,
                "product": 12
              },
              {
                "action": "show_subtotal",
                "value": 12
              },
              {
                "action": "write_digit",
                "digit": 2,
                "column": 1
              },
              {
                "action": "move_carry",
                "value": 1
              }
            ]
          },
          {
            "id": 3,
            "type": "multiplication_column",
            "title": "Calculate column 2",
            "products": [
              {
                "digit_a": 3,
                "digit_b": 1,
                "position_a": 1,
                "position_b": 0,
                "product": 3
              },
              {
                "digit_a": 2,
                "digit_b": 4,
                "position_a": 0,
                "position_b": 1,
                "product": 8
              }
            ],
            "subtotal": 11,
            "incoming_carry": 1,
            "total": 12,
            "write_digit": 2,
            "outgoing_carry": 1,
            "animation_events": [
              {
                "action": "highlight_and_connect",
                "position_a": 1,
                "position_b": 0,
                "digit_a": 3,
                "digit_b": 1,
                "product": 3
              },
              {
                "action": "highlight_and_connect",
                "position_a": 0,
                "position_b": 1,
                "digit_a": 2,
                "digit_b": 4,
                "product": 8
              },
              {
                "action": "show_subtotal",
                "value": 11
              },
              {
                "action": "add_carry",
                "value": 1,
                "total": 12
              },
              {
                "action": "write_digit",
                "digit": 2,
                "column": 2
              },
              {
                "action": "move_carry",
                "value": 1
              }
            ]
          },
          {
            "id": 4,
            "type": "multiplication_column",
            "title": "Calculate column 3",
            "products": [
              {
                "digit_a": 2,
                "digit_b": 1,
                "position_a": 0,
                "position_b": 0,
                "product": 2
              }
            ],
            "subtotal": 2,
            "incoming_carry": 1,
            "total": 3,
            "write_digit": 3,
            "outgoing_carry": 0,
            "animation_events": [
              {
                "action": "highlight_and_connect",
                "position_a": 0,
                "position_b": 0,
                "digit_a": 2,
                "digit_b": 1,
                "product": 2
              },
              {
                "action": "show_subtotal",
                "value": 2
              },
              {
                "action": "add_carry",
                "value": 1,
                "total": 3
              },
              {
                "action": "write_digit",
                "digit": 3,
                "column": 3
              }
            ]
          },
          {
            "id": 5,
            "type": "combine",
            "title": "Combine the digits",
            "result": 322
          }
        ],
        "animation_steps": [
          {
            "step_id": 1,
            "title": "Understand Vertically and Crosswise",
            "type": "introduction",
            "events": [
              {
                "action": "show_numbers",
                "number1": 23,
                "number2": 14
              },
              {
                "action": "show_instruction",
                "text": "Multiply vertically and crosswise, moving from right to left."
              }
            ]
          },
          {
            "step_id": 2,
            "title": "Calculate column 1",
            "type": "multiplication_column",
            "events": [
              {
                "action": "highlight_and_connect",
                "position_a": 1,
                "position_b": 1,
                "digit_a": 3,
                "digit_b": 4,
                "product": 12
              },
              {
                "action": "show_subtotal",
                "value": 12
              },
              {
                "action": "write_digit",
                "digit": 2,
                "column": 1
              },
              {
                "action": "move_carry",
                "value": 1
              }
            ]
          },
          {
            "step_id": 3,
            "title": "Calculate column 2",
            "type": "multiplication_column",
            "events": [
              {
                "action": "highlight_and_connect",
                "position_a": 1,
                "position_b": 0,
                "digit_a": 3,
                "digit_b": 1,
                "product": 3
              },
              {
                "action": "highlight_and_connect",
                "position_a": 0,
                "position_b": 1,
                "digit_a": 2,
                "digit_b": 4,
                "product": 8
              },
              {
                "action": "show_subtotal",
                "value": 11
              },
              {
                "action": "add_carry",
                "value": 1,
                "total": 12
              },
              {
                "action": "write_digit",
                "digit": 2,
                "column": 2
              },
              {
                "action": "move_carry",
                "value": 1
              }
            ]
          },
          {
            "step_id": 4,
            "title": "Calculate column 3",
            "type": "multiplication_column",
            "events": [
              {
                "action": "highlight_and_connect",
                "position_a": 0,
                "position_b": 0,
                "digit_a": 2,
                "digit_b": 1,
                "product": 2
              },
              {
                "action": "show_subtotal",
                "value": 2
              },
              {
                "action": "add_carry",
                "value": 1,
                "total": 3
              },
              {
                "action": "write_digit",
                "digit": 3,
                "column": 3
              }
            ]
          },
          {
            "step_id": 5,
            "title": "Combine the digits",
            "type": "combine",
            "events": [
              {
                "action": "reveal_result",
                "value": 322
              }
            ]
          }
        ],
        "result": 322
      }
    },
    "ekadhikena": {
      "request": "GET /sutras/ekadhikena/lesson?number=35&difficulty=beginner",
      "response": {
        "sutra": "Ekadhikena Purvena",
        "numbers": [
          35,
          35
        ],
        "difficulty": "beginner",
        "teaching_steps": [
          {
            "step": 1,
            "title": "Identify the number",
            "explanation": "We want to calculate 35 squared."
          },
          {
            "step": 2,
            "title": "Separate the last digit",
            "explanation": "35 ends in 5. The preceding part is 3."
          },
          {
            "step": 3,
            "title": "Add one to the preceding part",
            "explanation": "3 + 1 = 4."
          },
          {
            "step": 4,
            "title": "Multiply the two numbers",
            "explanation": "3 \u00d7 4 = 12."
          },
          {
            "step": 5,
            "title": "Append 25",
            "explanation": "Append 25 to 12, giving 1225."
          },
          {
            "step": 6,
            "title": "Final answer",
            "explanation": "35\u00b2 = 1225."
          }
        ],
        "animation_steps": [
          {
            "action": "show_number",
            "number": 35
          },
          {
            "action": "highlight_last_digit",
            "digit": 5,
            "previous": 3
          },
          {
            "action": "show_next_number",
            "previous": 3,
            "next_number": 4
          },
          {
            "action": "multiply_previous",
            "a": 3,
            "b": 4,
            "value": 12
          },
          {
            "action": "append_25",
            "left_part": 12,
            "right_part": "25"
          },
          {
            "action": "reveal_result",
            "result": 1225
          }
        ],
        "result": 1225
      }
    }
  }
};
