const STORAGE_KEY = "cleanroomInventoryItems";
const CATEGORY_STORAGE_KEY = "cleanroomInventoryCategories";
const UNCATEGORIZED = "Uncategorized";

const itemForm = document.getElementById("item-form");
const itemNameInput = document.getElementById("item-name");
const itemColorSelect = document.getElementById("item-color");
const activeList = document.getElementById("active-list");
const inactiveList = document.getElementById("inactive-list");
const activeCount = document.getElementById("active-count");
const inactiveCount = document.getElementById("inactive-count");
const itemOwnerInput = document.getElementById("item-owner");

let items = loadItems();
let categories = loadCategories();

initializeCategoryUI();
renderItems();

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = itemNameInput.value.trim();
  const owner = itemOwnerInput.value.trim();
  const color = itemColorSelect.value;
  const categorySelect = document.getElementById("item-category");
  const category = categorySelect?.value || UNCATEGORIZED;

  if (!name) return;

  const newItem = {
    id: crypto.randomUUID(),
    name,
    owner,
    color,
    category,
    customColor: color === "custom" ? "Custom" : "",
    saveStatus: "No-RS",
    notes: "",
    status: "active",
    createdDate: new Date().toISOString(),
    inactiveDate: null,
  };

  items.push(newItem);
  saveItems();
  renderItems();

  itemForm.reset();
  refreshCategoryOptions();
  itemNameInput.focus();
});

function loadItems() {
  const savedItems = localStorage.getItem(STORAGE_KEY);
  const loadedItems = savedItems ? JSON.parse(savedItems) : [];

  return loadedItems.map((item) => ({
    ...item,
    category: item.category || UNCATEGORIZED,
  }));
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadCategories() {
  const savedCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
  const loadedCategories = savedCategories
    ? JSON.parse(savedCategories)
    : [];

  return [...new Set(loadedCategories.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function saveCategories() {
  localStorage.setItem(
    CATEGORY_STORAGE_KEY,
    JSON.stringify(categories)
  );
}


// ==========================
// CATEGORY INTERFACE
// ==========================

function initializeCategoryUI() {
  if (!itemForm) return;

  // Add Category field to Add FOUP form
  if (!document.getElementById("item-category")) {
    const categoryField = document.createElement("div");
    categoryField.className = "form-field category-field";

    categoryField.innerHTML = `
      <label for="item-category">Category</label>
      <select id="item-category" aria-label="Category"></select>
    `;

    const submitButton = itemForm.querySelector(
      "button[type='submit'], button"
    );

    if (submitButton) {
      itemForm.insertBefore(categoryField, submitButton);
    } else {
      itemForm.appendChild(categoryField);
    }
  }

  // Add Category Manager
  if (!document.getElementById("category-manager")) {
    const manager = document.createElement("section");

    manager.id = "category-manager";
    manager.className = "category-manager";

    manager.innerHTML = `
      <div class="category-manager-header">

        <div>
          <h2>Categories</h2>
          <p>Create custom groups for organizing FOUP entries.</p>
        </div>

        <form id="category-form" class="category-form">

          <input
            id="new-category-name"
            type="text"
            maxlength="40"
            placeholder="New category name"
            aria-label="New category name"
          />

          <button type="submit">
            Add Category
          </button>

        </form>
      </div>

      <div id="category-list" class="category-list"></div>
    `;

    const formSection = itemForm.closest(".item-form-section");

    if (formSection) {
      formSection.insertAdjacentElement("afterend", manager);
    } else {
      itemForm.insertAdjacentElement("afterend", manager);
    }

    document
      .getElementById("category-form")
      .addEventListener("submit", (event) => {
        event.preventDefault();

        const input =
          document.getElementById("new-category-name");

        addCategory(input.value);

        input.value = "";
        input.focus();
      });
  }

  refreshCategoryOptions();
  renderCategoryManager();
}


// ==========================
// ADD CATEGORY
// ==========================

function addCategory(rawName) {
  const name = rawName.trim();

  if (!name) return;

  const alreadyExists = categories.some(
    (category) =>
      category.toLowerCase() === name.toLowerCase()
  );

  if (
    alreadyExists ||
    name.toLowerCase() === UNCATEGORIZED.toLowerCase()
  ) {
    return;
  }

  categories.push(name);

  categories.sort((a, b) =>
    a.localeCompare(b)
  );

  saveCategories();

  refreshCategoryOptions();
  renderCategoryManager();
  renderItems();
}

// DELETE CATEGORY

function deleteCategory(categoryName) {
  const itemCount = items.filter(
    (item) => item.category === categoryName
  ).length;

  const message = itemCount
    ? `Delete category "${categoryName}"? ${itemCount} item${
        itemCount === 1 ? "" : "s"
      } will be moved to ${UNCATEGORIZED}.`
    : `Delete category "${categoryName}"?`;

  if (!confirm(message)) return;

  categories = categories.filter(
    (category) => category !== categoryName
  );

  // Move items into Uncategorized
  items.forEach((item) => {
    if (item.category === categoryName) {
      item.category = UNCATEGORIZED;
    }
  });

  saveCategories();
  saveItems();

  refreshCategoryOptions();
  renderCategoryManager();
  renderItems();
}

// Editing Categories

function editCategory(oldCategoryName) {
  const updatedName = prompt(
    "Rename category:",
    oldCategoryName
  );

  if (updatedName === null) return;

  const newCategoryName = updatedName.trim();

  if (!newCategoryName) return;

  if (
    newCategoryName.toLowerCase() ===
    UNCATEGORIZED.toLowerCase()
  ) {
    alert(
      `"${UNCATEGORIZED}" is reserved and cannot be used as a custom category name.`
    );

    return;
  }

  const duplicateExists = categories.some(
    (category) =>
      category !== oldCategoryName &&
      category.toLowerCase() ===
        newCategoryName.toLowerCase()
  );

  if (duplicateExists) {
    alert(
      `A category named "${newCategoryName}" already exists.`
    );

    return;
  }

  const categoryIndex =
    categories.indexOf(oldCategoryName);

  if (categoryIndex === -1) return;

  // Update the category name
  categories[categoryIndex] =
    newCategoryName;

  // Update every FOUP using that category
  items.forEach((item) => {
    if (item.category === oldCategoryName) {
      item.category = newCategoryName;
    }
  });

  categories.sort((a, b) =>
    a.localeCompare(b)
  );

  saveCategories();
  saveItems();

  refreshCategoryOptions();
  renderCategoryManager();
  renderItems();
}


// ==========================
// CATEGORY DROPDOWN
// ==========================

function refreshCategoryOptions() {
  const select =
    document.getElementById("item-category");

  if (!select) return;

  const previousValue =
    select.value || UNCATEGORIZED;

  select.innerHTML =
    buildCategoryOptions(previousValue);

  if (
    [UNCATEGORIZED, ...categories].includes(previousValue)
  ) {
    select.value = previousValue;
  }
}

function buildCategoryOptions(selectedCategory) {
  const allCategories = [
    UNCATEGORIZED,
    ...categories,
  ];

  return allCategories
    .map(
      (category) => `
        <option
          value="${escapeHtml(category)}"
          ${
            category === selectedCategory
              ? "selected"
              : ""
          }
        >
          ${escapeHtml(category)}
        </option>
      `
    )
    .join("");
}


// ==========================
// CATEGORY MANAGER
// ==========================

function renderCategoryManager() {
  const categoryList =
    document.getElementById("category-list");

  if (!categoryList) return;

  if (categories.length === 0) {
    categoryList.innerHTML = `
      <span class="category-empty">
        No custom categories yet.
      </span>
    `;

    return;
  }

  categoryList.innerHTML = categories
    .map((category) => {
      const count = items.filter(
        (item) => item.category === category
      ).length;

      return `
        <div class="category-chip">

          <span class="category-chip-name">
            ${escapeHtml(category)}
          </span>

          <strong>${count}</strong>

          <button
            type="button"
            class="category-edit-btn"
            data-action="edit-category"
            data-category="${escapeHtml(category)}"
            title="Rename category"
          >
            Edit
          </button>

          <button
            type="button"
            class="category-delete-btn"
            data-action="delete-category"
            data-category="${escapeHtml(category)}"
            aria-label="Delete ${escapeHtml(category)} category"
          >
            ×
          </button>

        </div>
      `;
    })
    .join("");
}


// ==========================
// RENDER INVENTORY
// ==========================

function renderItems() {
  activeList.innerHTML = "";
  inactiveList.innerHTML = "";

  const activeItems = items.filter(
    (item) => item.status === "active"
  );

  const inactiveItems = items.filter(
    (item) => item.status === "inactive"
  );

  activeCount.textContent = activeItems.length;
  inactiveCount.textContent = inactiveItems.length;

  renderColumn(
    activeItems,
    activeList,
    "No active items yet.",
    "active"
  );

  renderColumn(
    inactiveItems,
    inactiveList,
    "No inactive items yet.",
    "inactive"
  );

  renderCategoryManager();
}


// ==========================
// RENDER COLUMN
// Category → Month → FOUP
// ==========================

function renderColumn(
  columnItems,
  listElement,
  emptyMessage,
  columnType
) {
  listElement.innerHTML = "";

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "column-category-wrapper";


  const tabContainer =
  document.createElement("div");

tabContainer.className =
  "category-side-tabs";


// Add expand/collapse button
const toggleButton =
  document.createElement("button");

toggleButton.type = "button";

toggleButton.className =
  "category-tabs-toggle";

toggleButton.textContent = "»";

toggleButton.title =
  "Expand category tabs";


toggleButton.addEventListener(
  "click",
  () => {

    const isExpanded =
      tabContainer.classList.toggle(
        "expanded"
      );

    toggleButton.textContent =
      isExpanded ? "«" : "»";

    toggleButton.title =
      isExpanded
        ? "Collapse category tabs"
        : "Expand category tabs";
  }
);


tabContainer.appendChild(
  toggleButton
);


  const contentContainer =
    document.createElement("div");

  contentContainer.className =
    "category-content-container";


  wrapper.appendChild(tabContainer);
  wrapper.appendChild(contentContainer);

  listElement.appendChild(wrapper);


  if (columnItems.length === 0) {
    const message =
      document.createElement("p");

    message.className = "empty-message";
    message.textContent = emptyMessage;

    contentContainer.appendChild(message);

    return;
  }


  const groupedByCategory =
    groupItemsByCategory(columnItems);


  Object.entries(groupedByCategory).forEach(
    ([categoryName, categoryItems]) => {

      const categoryId =
        createCategoryId(
          columnType,
          categoryName
        );


      // =========================
      // SIDE TAB
      // =========================

      const tab =
        document.createElement("button");

      tab.type = "button";

      tab.className =
        "category-side-tab";

      const abbreviation =
        getCategoryAbbreviation(
          categoryName
        );

      tab.innerHTML = `
        <span class="category-tab-short">
          ${escapeHtml(abbreviation)}
        </span>

        <span class="category-tab-full">
          ${escapeHtml(categoryName)}
        </span>
      `;

      tab.title =
        `${categoryName} (${categoryItems.length})`;

      tab.addEventListener(
        "click",
        () => {

          const target =
            document.getElementById(
              categoryId
            );

          if (!target) return;

          // Open category if collapsed
          target.open = true;

          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          highlightCategoryTab(
            tabContainer,
            tab
          );
        }
      );


      tabContainer.appendChild(tab);


      // =========================
      // CATEGORY SECTION
      // =========================

      const categorySection =
        document.createElement("details");

      categorySection.className =
        "category-section";

      categorySection.id =
        categoryId;

      categorySection.open = true;


      const categorySummary =
        document.createElement("summary");

      categorySummary.className =
        "category-summary";

      categorySummary.innerHTML = `
        <span>
          ${escapeHtml(categoryName)}
        </span>

        <span class="category-count">
          ${categoryItems.length}
        </span>
      `;


      const categoryItemsContainer =
        document.createElement("div");

      categoryItemsContainer.className =
        "category-items";


      // =========================
      // MONTH GROUPS
      // =========================

      const groupedItems =
        groupItemsByCreatedMonth(
          categoryItems
        );


      Object.keys(groupedItems).forEach(
        (monthLabel) => {

          const details =
            document.createElement(
              "details"
            );

          details.className =
            "month-section";

          details.open = true;


          const summary =
            document.createElement(
              "summary"
            );

          summary.className =
            "month-summary";

          summary.textContent =
            `${monthLabel} (${groupedItems[monthLabel].length})`;


          const monthItemsContainer =
            document.createElement(
              "div"
            );

          monthItemsContainer.className =
            "month-items";


          groupedItems[monthLabel].forEach(
            (item) => {

              const card =
                createItemCard(item);

              monthItemsContainer.appendChild(
                card
              );

            }
          );


          details.appendChild(
            summary
          );

          details.appendChild(
            monthItemsContainer
          );

          categoryItemsContainer.appendChild(
            details
          );

        }
      );


      categorySection.appendChild(
        categorySummary
      );

      categorySection.appendChild(
        categoryItemsContainer
      );

      contentContainer.appendChild(
        categorySection
      );

    }
  );
}


// ==========================
// GROUP BY CATEGORY
// ==========================

function groupItemsByCategory(columnItems) {
  const orderedCategoryNames = [
    ...categories,
    UNCATEGORIZED,

    ...columnItems
      .map(
        (item) =>
          item.category || UNCATEGORIZED
      )
      .filter(
        (category, index, array) =>
          !categories.includes(category) &&
          category !== UNCATEGORIZED &&
          array.indexOf(category) === index
      ),
  ];

  return orderedCategoryNames.reduce(
    (groups, categoryName) => {

      const categoryItems =
        columnItems.filter(
          (item) =>
            (item.category || UNCATEGORIZED) ===
            categoryName
        );

      if (categoryItems.length > 0) {
        groups[categoryName] =
          categoryItems;
      }

      return groups;

    },
    {}
  );
}


// ==========================
// CREATE FOUP CARD
// ==========================

function createItemCard(item) {
  const card =
    document.createElement("article");

  card.className =
    `item-card ${item.color}`;


  const inactiveDateText =
    item.inactiveDate
      ? `
        <div>
          <strong>Inactive Date:</strong>
          ${formatDate(item.inactiveDate)}
        </div>
      `
      : "";


  card.innerHTML = `

    <div class="item-card-header">

      <h3 class="item-name">
        ${escapeHtml(item.name)}
      </h3>


      <div class="pill-group">

        <span class="category-pill">
          ${escapeHtml(
            item.category || UNCATEGORIZED
          )}
        </span>


        <span class="color-pill">

          ${
            item.color === "custom"
              ? escapeHtml(
                  item.customColor || "Custom"
                )
              : formatLabel(item.color)
          }

        </span>


        <span
          class="save-pill ${
            item.saveStatus === "Yes-RS"
              ? "save"
              : "not-save"
          }"
        >

          ${formatLabel(
            item.saveStatus || "No-RS"
          )}

        </span>

      </div>

    </div>


    <div class="item-details">

      <div>
        <strong>Created:</strong>
        ${formatDate(item.createdDate)}
      </div>


      <label
        class="inline-edit-label"
        for="category-${item.id}"
      >

        <strong>Category:</strong>

        <select
          id="category-${item.id}"
          class="category-select"
          data-action="change-category"
          data-id="${item.id}"
        >

          ${buildCategoryOptions(
            item.category || UNCATEGORIZED
          )}

        </select>

      </label>


      <label class="inline-edit-label">

        <strong>Owner:</strong>

        <input
          class="owner-input"
          data-action="change-owner"
          data-id="${item.id}"
          value="${escapeHtml(
            item.owner || ""
          )}"
          placeholder="Owner"
        />

      </label>


      ${
        item.color === "custom"
          ? `

        <label
          class="inline-edit-label"
          for="custom-color-${item.id}"
        >

          <strong>
            Custom Tape Color:
          </strong>

          <input
            id="custom-color-${item.id}"
            class="custom-color-input"
            data-action="change-custom-color"
            data-id="${item.id}"
            value="${escapeHtml(
              item.customColor || ""
            )}"
            placeholder="Enter custom tape color"
          />

        </label>

      `
          : ""
      }


      <label
        class="notes-label"
        for="notes-${item.id}"
      >

        <strong>Notes:</strong>

        <textarea
          id="notes-${item.id}"
          class="notes-textarea"
          data-action="change-notes"
          data-id="${item.id}"
          placeholder="Add notes about this item..."
        >${escapeHtml(
          item.notes || ""
        )}</textarea>

      </label>


      <label
        class="inline-edit-label"
        for="save-status-${item.id}"
      >

        <strong>RS:</strong>

        <select
          id="save-status-${item.id}"
          class="save-status-select"
          data-action="change-save-status"
          data-id="${item.id}"
        >

          <option
            value="No-RS"
            ${getSelected(
              item.saveStatus,
              "No-RS"
            )}
          >
            No
          </option>

          <option
            value="Yes-RS"
            ${getSelected(
              item.saveStatus,
              "Yes-RS"
            )}
          >
            Yes
          </option>

        </select>

      </label>


      ${inactiveDateText}

    </div>


    <div class="item-actions">

      <button
        class="edit-btn"
        type="button"
        data-action="edit"
        data-id="${item.id}"
      >
        Edit
      </button>


      <button
        class="move-btn"
        type="button"
        data-action="move"
        data-id="${item.id}"
      >

        Move to ${
          item.status === "active"
            ? "Inactive"
            : "Active"
        }

      </button>


      <button
        class="delete-btn"
        type="button"
        data-action="delete"
        data-id="${item.id}"
      >
        Delete
      </button>

    </div>

  `;

  return card;
}


// ==========================
// GROUP BY CREATED MONTH
// ==========================

function groupItemsByCreatedMonth(columnItems) {
  const sortedItems = [...columnItems].sort(
    (a, b) =>
      new Date(b.createdDate) -
      new Date(a.createdDate)
  );

  return sortedItems.reduce(
    (groups, item) => {

      const monthLabel =
        formatCreatedMonth(
          item.createdDate
        );

      if (!groups[monthLabel]) {
        groups[monthLabel] = [];
      }

      groups[monthLabel].push(item);

      return groups;

    },
    {}
  );
}


function formatCreatedMonth(dateString) {
  return new Date(dateString).toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "long",
    }
  );
}


// ==========================
// CLICK EVENTS
// ==========================

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) return;

    const action =
      button.dataset.action;

    const id =
      button.dataset.id;


    if (action === "edit") {

      editItem(id);

    } else if (action === "move") {

      moveItem(id);

    } else if (action === "delete") {

      deleteItem(id);

    } else if (
  action === "edit-category"
) {

  editCategory(
    button.dataset.category
  );

} else if (
  action === "delete-category"
) {

  deleteCategory(
    button.dataset.category
  );

}

  }
);


// ==========================
// SELECT CHANGE EVENTS
// ==========================

document.addEventListener(
  "change",
  (event) => {

    const saveStatusSelect =
      event.target.closest(
        "select[data-action='change-save-status']"
      );

    if (saveStatusSelect) {

      changeSaveStatus(
        saveStatusSelect.dataset.id,
        saveStatusSelect.value
      );

      return;
    }


    const categorySelect =
      event.target.closest(
        "select[data-action='change-category']"
      );

    if (categorySelect) {

      changeCategory(
        categorySelect.dataset.id,
        categorySelect.value
      );

    }

  }
);


// ==========================
// INPUT EVENTS
// ==========================

document.addEventListener(
  "input",
  (event) => {

    const customColorInput =
      event.target.closest(
        "input[data-action='change-custom-color']"
      );

    if (customColorInput) {

      changeCustomColor(
        customColorInput.dataset.id,
        customColorInput.value
      );

      return;
    }


    const ownerInput =
      event.target.closest(
        "input[data-action='change-owner']"
      );

    if (ownerInput) {

      changeOwner(
        ownerInput.dataset.id,
        ownerInput.value
      );

      return;
    }


    const notesBox =
      event.target.closest(
        "textarea[data-action='change-notes']"
      );

    if (notesBox) {

      changeNotes(
        notesBox.dataset.id,
        notesBox.value
      );

    }

  }
);


// ==========================
// EDIT FOUP NAME
// ==========================

function editItem(id) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;


  const updatedName = prompt(
    "Edit FOUP name:",
    item.name
  );

  if (updatedName === null) return;


  const trimmedName =
    updatedName.trim();

  if (!trimmedName) return;


  item.name = trimmedName;

  saveItems();
  renderItems();
}


// ==========================
// CHANGE CATEGORY
// ==========================

function changeCategory(
  id,
  newCategory
) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;


  item.category =
    newCategory || UNCATEGORIZED;

  saveItems();
  renderItems();
}


// ==========================
// CHANGE RS STATUS
// ==========================

function changeSaveStatus(
  id,
  newSaveStatus
) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;


  item.saveStatus =
    newSaveStatus;

  saveItems();
  renderItems();
}


// ==========================
// MOVE ACTIVE / INACTIVE
// ==========================

function moveItem(id) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;


  if (item.status === "active") {

    item.status = "inactive";

    item.inactiveDate =
      new Date().toISOString();

  } else {

    item.status = "active";

    item.inactiveDate = null;

  }


  saveItems();
  renderItems();
}


// ==========================
// DELETE FOUP
// ==========================

function deleteItem(id) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;


  const confirmed = confirm(
    `Delete "${item.name}"?`
  );

  if (!confirmed) return;


  items = items.filter(
    (item) => item.id !== id
  );

  saveItems();
  renderItems();
}


// ==========================
// HELPERS
// ==========================

function getSelected(
  currentValue,
  optionValue
) {
  const normalizedValue =
    currentValue || "No-RS";

  return normalizedValue === optionValue
    ? "selected"
    : "";
}


function formatLabel(value) {
  if (value === "No-RS") return "No";

  if (value === "Yes-RS") return "Yes";

  if (value === "none") return "N/A";

  if (value === "not-save")
    return "Not Save";

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


function formatDate(dateString) {
  return new Date(
    dateString
  ).toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createCategoryId(
  columnType,
  categoryName
) {
  const safeName = categoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${columnType}-category-${safeName}`;
}


function highlightCategoryTab(
  tabContainer,
  activeTab
) {
  const tabs =
    tabContainer.querySelectorAll(
      ".category-side-tab"
    );

  tabs.forEach((tab) => {
    tab.classList.remove("active");
  });

  activeTab.classList.add("active");
}

function getCategoryAbbreviation(
  categoryName
) {
  if (!categoryName) return "?";

  // Special case
  if (
    categoryName === UNCATEGORIZED
  ) {
    return "UNC";
  }

  const words =
    categoryName
      .trim()
      .split(/\s+/);


  // Example:
  // "Engineering Hold" → "EH"
  if (words.length > 1) {

    return words
      .slice(0, 3)
      .map(
        (word) =>
          word.charAt(0).toUpperCase()
      )
      .join("");

  }


  // Example:
  // "Etch" → "ETC"
  return categoryName
    .slice(0, 3)
    .toUpperCase();
}

// ==========================
// CHANGE CUSTOM COLOR
// ==========================

function changeCustomColor(
  id,
  newCustomColor
) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;

  item.customColor =
    newCustomColor;

  saveItems();
}


// ==========================
// CHANGE OWNER
// ==========================

function changeOwner(
  id,
  newOwner
) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;

  item.owner =
    newOwner;

  saveItems();
}


// ==========================
// CHANGE NOTES
// ==========================

function changeNotes(
  id,
  newNotes
) {
  const item =
    items.find(
      (item) => item.id === id
    );

  if (!item) return;

  item.notes =
    newNotes;

  saveItems();
}