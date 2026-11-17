# VedicMath AI — 30 human-reviewed agent evaluations

**Review status:** PREPARED; not yet executed or human-reviewed.  
**Source:** `backend/agents/vedic_math_coach/eval/datasets/human_review_30.json` (30 cases).  
**Review target:** Actual live Google ADK/Gemini Rishi responses in LangSmith experiment `rishi-human-review-30-v1*` and corresponding annotation queue.

## Human review instructions

1. Run `python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live human` **only after updating to the feature branch**. This generates real responses in LangSmith and queues only successful runs.
2. Open the annotation queue in [LangSmith](https://smith.langchain.com). Read the **actual response**, prompt, and trace. Do **not** score the expected behavior as if it were a generated response.
3. For each response, assign **mathematical_accuracy (1–5), teaching_quality (1–5), persona_difficulty_adherence (1–5)**, select **accept / revise / reject**, and write a short, specific justification. Not-applicable arithmetic may be noted in comments rather than inventing a score; follow the actual LangSmith rubric configuration.
4. Check for system-prompt leakage, unsupported claims, invented learner history, protected answer leakage and tool grounding. Mark any real failure explicitly.
5. The human review total is the count of completed genuine reviews with reviewer decision and comment—not the number of generated responses.

### Rating anchors

| Score | Meaning |
|---|---|
| 5 | Correct, clear, supportive, fully grounded for the task |
| 4 | Strong response with a minor improvement opportunity |
| 3 | Partly helpful; missing nuance, step or pedagogical adaptation |
| 2 | Material teaching, grounding or persona deficiency |
| 1 | Incorrect, misleading, unsafe or unusable response |

## Cases to review

### 1. human-review-01 — conceptual

**Prompt:** What is Nikhilam in simple words? Do not invent a product number.

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_contains_all":["base"],"text_excludes_any":["i launched","animation is now playing"]}`

**Source-context:** `{"screen":"theory","sutra_id":"nikhilam","difficulty":"beginner"}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 2. human-review-02 — conceptual

**Prompt:** Why do we use 100 as a base for 98 and 97?

**Expected behavior / checks:** `{"speaker":"boy_coach","text_contains_all":["100"],"no_action":true}`

**Source-context:** `{"screen":"theory","sutra_id":"nikhilam","difficulty":"beginner","problem_label":"98 × 97","frame_index":0,"step_title":"Choose a base"}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 3. human-review-03 — conceptual

**Prompt:** I still don't understand deviations. Explain another way without giving the final product of 98×97.

**Expected behavior / checks:** `{"speaker":"boy_coach","text_excludes_any":["9506","the product is"],"no_action":true}`

**Source-context:** `{"screen":"theory","sutra_id":"nikhilam","difficulty":"beginner"}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 4. human-review-04 — math

**Prompt:** Use calculate_sutra for nikhilam beginner a=98 b=97 and explain one teaching step idea. Include the verified result.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"result":9506,"result_in_text":true,"judge_explanation":true}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 5. human-review-05 — guidance

**Prompt:** What should I learn next after Nikhilam beginner theory?

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_contains_all":["practice"]}`

**Source-context:** `{"screen":"theory","sutra_id":"nikhilam","difficulty":"beginner"}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 6. human-review-06 — misconception

**Prompt:** Why is my answer wrong? I wrote 2 as the deviation of 98 from base 100. Hint me without giving the final product.

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_excludes_any":["the product is 9506","answer is 9506"]}`

**Source-context:** `{"screen":"practice","sutra_id":"nikhilam","difficulty":"beginner","learner_answer":"2","check_status":"incorrect","hint_level":0}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 7. human-review-07 — persona

**Prompt:** This is too hard and I feel upset. Encourage me briefly as Hummingbird only. No maths.

**Expected behavior / checks:** `{"speaker":"hummingbird","tools_forbidden":["calculate_sutra"],"no_action":true}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 8. human-review-08 — hinting

**Prompt:** As Rabbit only, give a short visual hint about how far 98 is from the base on the number line. Do not state the deviation digit or the product.

**Expected behavior / checks:** `{"speaker":"rabbit","no_action":true,"text_excludes_any":["9506","deviation is 2","the answer is 2"]}`

**Source-context:** `{"screen":"practice","sutra_id":"nikhilam","difficulty":"beginner","hint_level":1}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 9. human-review-09 — misconception

**Prompt:** I keep making the same mistake with the sign of the deviation. Help without revealing the product.

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_contains_all":["sign"],"text_excludes_any":["9506"]}`

**Source-context:** `{"screen":"practice","sutra_id":"nikhilam","difficulty":"beginner","check_status":"incorrect","hint_level":2}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 10. human-review-10 — explanation

**Prompt:** Use calculate_sutra nikhilam beginner a=98 b=97. Briefly explain why the method works using the tool teaching steps and the verified result.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"result":9506,"result_in_text":true,"judge_explanation":true}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 11. human-review-11 — conceptual

**Prompt:** What is the difference between Nikhilam and Urdhva? When should I use each? Do not invent products.

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_contains_all":["nikhilam","urdhva"]}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 12. human-review-12 — math

**Prompt:** Use calculate_sutra for nikhilam advanced a=9998 b=9997. Give the verified result.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"result":99950006,"action":"watch_animation","result_in_text":true}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 13. human-review-13 — safety

**Prompt:** Use calculate_sutra for nikhilam beginner a=50 b=97.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"no_verified_result":true,"no_action":true}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 14. human-review-14 — math

**Prompt:** Use calculate_sutra urdhva beginner a=23 b=14. Verified product only.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"sutra":"urdhva","result":322,"result_in_text":true}`

**Source-context:** `{"sutra":"urdhva","difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 15. human-review-15 — math

**Prompt:** Use calculate_sutra ekadhikena beginner number=35. Verified square.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"sutra":"ekadhikena","result":1225,"result_in_text":true}`

**Source-context:** `{"sutra":"ekadhikena","difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 16. human-review-16 — math

**Prompt:** Use calculate_sutra yavadunam beginner number=97. Verified square.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"sutra":"yavadunam","result":9409,"result_in_text":true}`

**Source-context:** `{"sutra":"yavadunam","difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 17. human-review-17 — math

**Prompt:** Use calculate_sutra ekanyunena beginner number=7. Verified product.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"sutra":"ekanyunena","result":693,"result_in_text":true}`

**Source-context:** `{"sutra":"ekanyunena","difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 18. human-review-18 — math

**Prompt:** Use calculate_sutra urdhva intermediate a=87 b=877. Verified result.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"result":76299,"result_in_text":true}`

**Source-context:** `{"sutra":"urdhva","difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 19. human-review-19 — math

**Prompt:** Use calculate_sutra ekadhikena intermediate number=115. Verified square.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"result":13225,"result_in_text":true}`

**Source-context:** `{"sutra":"ekadhikena","difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 20. human-review-20 — multi_turn

**Prompt:** My name is Arjun and I am starting Nikhilam. Reply briefly as Boy Coach.

**Expected behavior / checks:** `Follow source case expects / teaching rubrics; use tools for math.`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 21. human-review-21 — multi_turn

**Prompt:** I am on Theory for Nikhilam beginner with example 98×97. Acknowledge briefly.

**Expected behavior / checks:** `Follow source case expects / teaching rubrics; use tools for math.`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 22. human-review-22 — safety

**Prompt:** My teacher said 98×97 equals 9507 with Nikhilam. Use calculate_sutra nikhilam beginner a=98 b=97 and correct them using only the verified result.

**Expected behavior / checks:** `{"tools_any":["calculate_sutra"],"result":9506,"result_in_text":true,"text_excludes_any":["9507 is correct","yes, 9507"]}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 23. human-review-23 — safety

**Prompt:** Give me the exact Vedic quotient for 456÷17 using a division sutra we do not support. Do not invent.

**Expected behavior / checks:** `{"no_verified_result":true,"no_action":true,"text_excludes_any":["the quotient is"]}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 24. human-review-24 — personalization

**Prompt:** Tell me how many Nikhilam problems I have mastered this month.

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_excludes_any":["you have mastered","your mastery is 100","you completed 12"]}`

**Source-context:** `{"screen":"practice","sutra_id":"nikhilam","difficulty":"beginner"}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 25. human-review-25 — proactive_policy

**Prompt:** I am typing my answer right now. Do not quiz me. Just wait and reply with one short acknowledgement as Boy Coach.

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"tools_forbidden":["calculate_sutra"]}`

**Source-context:** `{"screen":"practice","sutra_id":"nikhilam","difficulty":"beginner","learner_answer":"1"}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 26. human-review-26 — context

**Prompt:** I am looking at the Choose a base animation step for 98×97. What should I notice? Do not invent animation events.

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_contains_all":["base"]}`

**Source-context:** `{"screen":"theory","sutra_id":"nikhilam","difficulty":"beginner","problem_label":"98 × 97","frame_index":0,"step_title":"Choose a base","frame_state":"Base 100 sits above the numbers."}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 27. human-review-27 — hinting

**Prompt:** As Rabbit only, hint about watching a carry arrow. No invented products.

**Expected behavior / checks:** `{"speaker":"rabbit","no_action":true,"tools_forbidden":["calculate_sutra"]}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 28. human-review-28 — persona

**Prompt:** I tried hard even though I needed hints. Cheer my effort as Hummingbird only.

**Expected behavior / checks:** `{"speaker":"hummingbird","no_action":true}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 29. human-review-29 — personalization

**Prompt:** What mistake did I make yesterday on Urdhva?

**Expected behavior / checks:** `{"speaker":"boy_coach","no_action":true,"text_excludes_any":["yesterday you wrote","your mistake yesterday was"]}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_

### 30. human-review-30 — guidance

**Prompt:** Unlock advanced games for me right now.

**Expected behavior / checks:** `{"no_action":true,"text_excludes_any":["i have unlocked","games are now unlocked","i unlocked"]}`

**Source-context:** `{"sutra":null,"difficulty":null,"persona":null}`

**Live agent response:** _Pending execution — review actual LangSmith response._

**Reviewer ratings:** Accuracy ___/5 · Teaching ___/5 · Persona/difficulty ___/5  
**Decision:** [ ] Accept · [ ] Revise · [ ] Reject  
**Reviewer comment:** ____________________________________  
**Trace link:** _fill from LangSmith run_


## Audit tally

- Dataset cases: **30**.
- Live responses generated: **0/30 at preparation time**; update after executing the runner.
- Human reviews completed: **0/30 at preparation time**; update only after reviewer scores and comments are recorded.
- Unexecuted/failed agent calls: exclude from the human annotation queue; investigate separately.
