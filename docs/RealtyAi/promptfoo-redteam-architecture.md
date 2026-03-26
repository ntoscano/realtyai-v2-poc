# Evaluation System Architecture

```
+-----------------------------------------------+
|                  Frontend UI                   |
|           (Eval kick-off interface)            |
+-----------------------------------------------+
                       |
                       v
+-----------------------------------------------+
|     AI API - Evaluation Orchestrator           |
|  Builds the test matrix:                       |
|  providers x test features x test prompts      |
+-----------------------------------------------+
                       |
                       v
+-----------------------------------------------+
|                 Job Queue                      |
|         Job Creator / Sorter                   |
+-----------------------------------------------+
                       |
                       v
+-----------------------------------------------+
|                Worker Pool                     |
|   Rate Limit Info + Throttle Orchestrator      |
+-----------------------------------------------+
                       |
                       v
+-----------------------------------------------+
|             Evaluation Engine                  |
|           (Extensibility layer)                |
+-----------------------------------------------+
                       |
                       v
+-----------------------------------------------+
|                Results DB                      |
|  Eval results, input prompts, provider outputs |
+-----------------------------------------------+
```
