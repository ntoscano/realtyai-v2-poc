# Candidate Technical Design Template

# Context

- 💡Author tips
    <aside>
    💡
    
    What is the goal of this project and why?
    
    What problem is the project solving? How? Don't recreate the Product Brief, but provide enough context so that reviewers (including those not on your team) don't need to read all supporting documents.
    
    List the features or functionality that are out-of-scope for this project. Often these are nice-to-have additions cut from a **minimum viable product** (**MVP**) that we could add in later versions.
    
    What questions remain? What assumptions are you making? Are there dependencies on other projects, products, or teams?
    
    </aside>


# Technical Overview

- 💡 Author tips
    <aside>
    💡 Provide a one paragraph overview of the project’s design.
    
    </aside>


## Diagram

- 💡 Author tips
    <aside>
    💡 Show the information flow and separation of concerns between key services and components to provide the larger picture this project fits into. If you don’t have a favorite tool, consider [Excalidraw](https://excalidraw.com/).
    
    </aside>


## Data Model

- 💡 Author tips
    <aside>
    💡 Consider the following:
    
    1. What data entities are involved (consider an [entity relationship diagrams](https://mermaid.js.org/syntax/entityRelationshipDiagram.html))?
    2. What are the data access patterns?
    3. Missing indexes cause incidents. What are the performance implications of new or updated access patterns?
    </aside>


## Interface

- 💡 Author tips
    <aside>
    💡 What is the contract between this project and others?
    
    - Frontend: describe the implementation
    - Services: list the REST API endpoints, including request/response bodies
    </aside>


## Metrics

- 💡 Author tips
    <aside>
    💡 What do we need to monitor or track when we release this project?
    
    </aside>


# Delivery Milestones

- 💡Author tips
    <aside>
    💡
    
    In what order should this project be executed? What will we release first, and how?
    
    </aside>


# Abandoned Ideas

- 💡 Author tips
    <aside>
    💡 Which alternative solutions did you consider, and why were they abandoned?
    
    </aside>
