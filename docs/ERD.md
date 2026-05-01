# Entity Relationship Diagram (ERD)
## Coding Challenge Platform

### Entity Overview

(see full ERD in docs/ARCHITECTURE.md)

### Detailed Table Specifications

#### interviewers
id              UUID PRIMARY KEY
email           VARCHAR(255) UNIQUE NOT NULL
name            VARCHAR(255) NOT NULL
password_hash   VARCHAR(255) NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()

#### candidates
id                UUID PRIMARY KEY
name              VARCHAR(255) NOT NULL
email             VARCHAR(255)
experience_level  VARCHAR(50)
skills            TEXT[]
summary           TEXT
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

#### job_descriptions
id                UUID PRIMARY KEY
title             VARCHAR(255) NOT NULL
description       TEXT NOT NULL
required_skills   TEXT[]
tech_stack        TEXT[]
experience_level  VARCHAR(50)
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

#### sessions
id                UUID PRIMARY KEY
challenge_token   VARCHAR(255) UNIQUE NOT NULL
candidate_id      UUID FOREIGN KEY -> candidates(id)
job_description_id UUID FOREIGN KEY -> job_descriptions(id)
interviewer_id    UUID FOREIGN KEY -> interviewers(id)
status            VARCHAR(50)
languages         TEXT[]
created_at        TIMESTAMP DEFAULT NOW()
expires_at        TIMESTAMP NOT NULL
updated_at        TIMESTAMP DEFAULT NOW()

#### code_submissions
id                UUID PRIMARY KEY
session_id        UUID FOREIGN KEY -> sessions(id)
code              TEXT NOT NULL
language          VARCHAR(50) NOT NULL
submitted_at      TIMESTAMP DEFAULT NOW()
analysis          JSONB

#### questions
id                UUID PRIMARY KEY
text              TEXT NOT NULL
category          VARCHAR(100)
level             VARCHAR(50)
answer            TEXT NOT NULL
explanation       TEXT
languages         TEXT[]
question_type     VARCHAR(50)
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

#### code_snippets
id                UUID PRIMARY KEY
title             VARCHAR(255) NOT NULL
code              TEXT NOT NULL
language          VARCHAR(50) NOT NULL
level             VARCHAR(50)
category          VARCHAR(100)
explanation       TEXT
tags              TEXT[]
created_by_id     UUID FOREIGN KEY -> interviewers(id)
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
