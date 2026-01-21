# Multitasking Framework

Developers are working with a lot of necessary complexity when crafting a game. Wrangling that complexity is difficult in any engine, but studio makes some simplifying assumptions that make it harder, not easier, to create.

---

## Core Concepts

### The Three Axes

Every view in the system is defined by three independent axes:

|Axis|Question it answers|Examples|
|---|---|---|
|**Scope**|What namespace am I looking into?|Game, Asset, Inventory, Creator Store, Package, Avatar|
|**State**|In what mode does it exist?|Edit, Client (running player), Server (running authority), Preview, Browse|
|**Presentation**|How is it rendered?|3D viewport, Tree, Graph, Timeline, 2D canvas, Table, Text, Properties, Log|

A **View** is a single panel defined by the tuple `(Scope, State, Presentation)`.

### Examples of Views

| Description                                | Scope         | State      | Presentation |
| ------------------------------------------ | ------------- | ---------- | ------------ |
| The 3D editor viewport                     | Game          | Edit       | 3D           |
| The explorer/hierarchy panel               | Game          | Edit       | Tree         |
| The player's perspective while playtesting | Game          | Client     | 3D           |
| Runtime object hierarchy (debugging)       | Game          | Client     | Tree         |
| Server-side object state                   | Game          | Server     | Table        |
| Console output                             | Game          | Client     | Log          |
| Editing a script                           | Asset         | Edit       | Text         |
| Animation keyframes                        | Asset         | Edit       | Timeline     |
| Animation curves                           | Asset         | Edit       | Curves       |
| Material node graph                        | Asset         | Edit       | Graph        |
| Browsing my saved assets                   | Inventory     | Browse     | Grid         |
| Shopping for assets                        | Creator Store | Browse     | Grid         |
| Object properties                          | (inherits)    | (inherits) | Properties   |

### Scopes

| Type | Scope         | What it contains                                      | Editable       |
| ---- | ------------- | ----------------------------------------------------- | -------------- |
| r/w  | Game          | Places, instances, runtime state                      | Yes            |
| r/w  | Asset         | A single resource (mesh, animation, script, material) | Yes            |
| r/w  | Package       | A versioned, publishable bundle                       | Yes (if owned) |
| r    | Inventory     | My owned assets across experiences                    | Organize only  |
| r    | Creator Store | Marketplace assets from others                        | Read-only      |

### States

|Scope|Edit|Client|Server|Preview|Browse|
|---|:-:|:-:|:-:|:-:|:-:|
|Game|✓|✓|✓|—|—|
|Asset|✓|—|—|✓|—|
|Inventory|—|—|—|✓|✓|
|Creator Store|—|—|—|✓|✓|
|Package|✓|—|—|—|—|
|Avatar|✓|—|—|✓|—|

### Context

A **Context** is a `(Scope, State)` pair that maintains independent selection and undo history.

Examples:

- `(Game, Edit)` — editing the experience
- `(Game, Client)` — running as player
- `(Game, Server)` — observing server state
- `(Asset, Edit)` — editing an animation or material
- `(Inventory, Browse)` — browsing my saved content

Views within the same Context share selection. Views in different Contexts have independent selection.

---

## Tasks and View Coordination

A **Task** is what the user is trying to accomplish. Tasks require one or more views arranged together. The relationship between views determines how they coordinate.

### Single View

One view is sufficient for the task.

|Task|View|
|---|---|
|Reading a script|`(Asset, Edit, Text)`|
|Watching a playtest|`(Game, Client, 3D)`|
|Browsing the store|`(Creator Store, Browse, Grid)`|

### Coordinated Multiview

Multiple views working together. Coordination type depends on which axes are shared vs. different:

---

#### Faceted Views

**Same Scope, Same State, Different Presentation**

Multiple presentations of the same thing. This is the classic "inspector pattern."

|View 1|View 2|View 3|
|---|---|---|
|`(Game, Edit, 3D)`|`(Game, Edit, Tree)`|`(Game, Edit, Properties)`|

**Task**: Level design — viewport shows spatial layout, tree shows hierarchy, properties show selected object's attributes.

**Linking behavior**: Shared selection. Clicking an object in any view selects it in all views.

---

#### Modal Views

**Same Scope, Different State, Same/Different Presentation**

The same thing in different modes—typically edit vs. runtime.

|View 1|View 2|
|---|---|
|`(Game, Edit, 3D)`|`(Game, Client, 3D)`|

**Task**: Edit-while-playing — see authored state alongside running state.

|View 1|View 2|
|---|---|
|`(Game, Client, 3D)`|`(Game, Server, 3D)`|

**Task**: Multiplayer debugging — compare what client sees vs. server authority.

|View 1|View 2|
|---|---|
|`(Game, Edit, Text)`|`(Game, Client, Log)`|

**Task**: Scripting with feedback — write code, see runtime errors.

**Linking behavior**: Object identity links across states. The same object exists in both views but may have different runtime state. Selecting in one can highlight the corresponding object in the other.

---

#### Parallel Views

**Different Scope, Same State, Same Presentation**

Two independent things side by side—useful for comparison or transfer.

|View 1|View 2|
|---|---|
|`(Game:Place1, Edit, 3D)`|`(Game:Place2, Edit, 3D)`|

**Task**: Copying content between places.

|View 1|View 2|
|---|---|
|`(Asset:Material1, Edit, Graph)`|`(Asset:Material2, Edit, Graph)`|

**Task**: Comparing two materials.

**Linking behavior**: Independent. No shared selection. Drag-and-drop operations move content between scopes.

---

#### Contextual Reference Views

**Different Scope, Same State, Different Presentation**

Working in one scope while referencing another.

|View 1|View 2|
|---|---|
|`(Game, Edit, 3D)`|`(Asset, Edit, Properties)`|

**Task**: Building a level while inspecting asset details.

|View 1|View 2|
|---|---|
|`(Asset, Edit, Timeline)`|`(Game, Edit, 3D)`|

**Task**: Editing animation while seeing it in scene context.

**Linking behavior**: Usage links. If the Asset is used in the Game, there's an implicit relationship through instantiation.

---

#### Independent Views

**Different Scope, Different State**

Fully separate workstreams with no meaningful link.

|View 1|View 2|
|---|---|
|`(Game, Edit, 3D)`|`(Creator Store, Browse, Grid)`|

**Task**: Building while shopping for assets.

|View 1|View 2|
|---|---|
|`(Asset, Edit, Text)`|`(Inventory, Browse, Grid)`|

**Task**: Scripting while searching past work.

**Linking behavior**: None. Cross-scope operations (import, insert) are explicit user actions.

---

## Coordination Summary

|Coordination Type|Scope|State|Presentation|Selection Behavior|Example|
|---|:-:|:-:|:-:|---|---|
|**Faceted**|Same|Same|Different|Shared|Viewport + Explorer + Properties|
|**Modal**|Same|Different|Any|Object identity|Edit viewport + Play viewport|
|**Parallel**|Different|Same|Same|Independent (drag-drop)|Two places side-by-side|
|**Contextual**|Different|Same|Different|Usage links|Asset editor + Scene viewport|
|**Independent**|Different|Different|Any|None|Building + browsing store|

---

## Design Implications

### Every View Declares Its Tuple

No ambiguous panels. Every view clearly indicates its `(Scope, State, Presentation)` binding. This eliminates confusion about what "the viewport" or "the explorer" refers to when multiple contexts exist.

### Linking Rules Follow From the Model

The system determines linking behavior automatically based on which axes are shared:

|Shared axes|Behavior|
|---|---|
|Same Scope + Same State|Shared selection, shared undo|
|Same Scope + Different State|Object identity linking|
|Different Scope (with usage)|Highlight where asset is used|
|Different Scope (no usage)|Fully independent|

### Combinations Become Reachable

Want to see the server's object hierarchy as a tree while watching the client's 3D view? That's `(Game, Server, Tree)` + `(Game, Client, 3D)`. The tuple model makes this expressible and buildable.

### Task Templates

Common workflows can be predefined as view configurations:

|Template|Views|
|---|---|
|Level Design|`(Game, Edit, 3D)` + `(Game, Edit, Tree)` + `(Game, Edit, Properties)`|
|Playtest|`(Game, Edit, 3D)` + `(Game, Client, 3D)`|
|Multiplayer Debug|`(Game, Client, 3D)` + `(Game, Server, 3D)` + `(Game, Server, Tree)`|
|Animation|`(Asset, Edit, Timeline)` + `(Asset, Edit, 3D)` + `(Asset, Edit, Curves)`|
|Script + Test|`(Asset, Edit, Text)` + `(Game, Client, 3D)` + `(Game, Client, Log)`|

---

## Glossary

| Term               | Definition                                                        |
| ------------------ | ----------------------------------------------------------------- |
| **Scope**          | The namespace a view looks into (Game, Asset, Inventory, etc.)    |
| **State**          | The mode of existence (Edit, Client, Server, Preview, Browse)     |
| **Presentation**   | How content is rendered (3D, Tree, Graph, Timeline, Text, etc.)   |
| **View**           | A single panel defined by `(Scope, State, Presentation)`          |
| **Context**        | A `(Scope, State)` pair with independent selection and undo       |
| **Faceted views**  | Multiple presentations of the same Context (shared selection)     |
| **Modal views**    | Same Scope in different States (object identity linking)          |
| **Parallel views** | Different Scopes side-by-side (independent, drag-drop operations) |
| **Task**           | A user goal requiring one or more coordinated views               |
