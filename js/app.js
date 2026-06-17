(function () {
  "use strict";

  var STORAGE_KEY = "aquaglass_codificador_historial";
  var MASTER_STORAGE_KEY = "aquaglass_codificador_maestra";
  var MAX_HISTORY = 100;

  var state = {
    database: null,
    originalDatabase: null,
    activeCategory: null,
    activeMasterCategoryId: "",
    selections: {},
    history: []
  };

  var elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    loadHistory();
    loadDatabase()
      .then(function (database) {
        state.originalDatabase = cloneData(database);
        state.database = loadMasterDatabase(database);
        state.activeMasterCategoryId = state.database.categories[0] ? state.database.categories[0].id : "";
        elements.databaseStatus.textContent = "Base local conectada";
        renderCategories();
        renderMasterPanel();
        renderHistory();
        resetConfiguration();
      })
      .catch(function () {
        elements.databaseStatus.textContent = "Error en base local";
        elements.categoryGrid.innerHTML = '<p class="history-empty">No se pudo leer data/database.json.</p>';
      });
  }

  function cacheElements() {
    elements.databaseStatus = document.getElementById("databaseStatus");
    elements.masterToggleBtn = document.getElementById("masterToggleBtn");
    elements.resetBtn = document.getElementById("resetBtn");
    elements.heroCode = document.getElementById("heroCode");
    elements.breadcrumb = document.getElementById("breadcrumb");
    elements.categoryGrid = document.getElementById("categoryGrid");
    elements.configTitle = document.getElementById("configTitle");
    elements.stepLabel = document.getElementById("stepLabel");
    elements.backToCategoriesBtn = document.getElementById("backToCategoriesBtn");
    elements.missingAlert = document.getElementById("missingAlert");
    elements.optionSections = document.getElementById("optionSections");
    elements.summaryImage = document.getElementById("summaryImage");
    elements.summaryCategory = document.getElementById("summaryCategory");
    elements.progressText = document.getElementById("progressText");
    elements.progressPercent = document.getElementById("progressPercent");
    elements.progressBar = document.getElementById("progressBar");
    elements.selectedList = document.getElementById("selectedList");
    elements.generatedCode = document.getElementById("generatedCode");
    elements.generatedDescription = document.getElementById("generatedDescription");
    elements.copyCodeBtn = document.getElementById("copyCodeBtn");
    elements.copyDescriptionBtn = document.getElementById("copyDescriptionBtn");
    elements.saveHistoryBtn = document.getElementById("saveHistoryBtn");
    elements.feedback = document.getElementById("feedback");
    elements.historySearch = document.getElementById("historySearch");
    elements.exportCsvBtn = document.getElementById("exportCsvBtn");
    elements.exportJsonBtn = document.getElementById("exportJsonBtn");
    elements.clearHistoryBtn = document.getElementById("clearHistoryBtn");
    elements.historyList = document.getElementById("historyList");
    elements.masterSection = document.getElementById("masterSection");
    elements.masterCategorySelect = document.getElementById("masterCategorySelect");
    elements.masterStatus = document.getElementById("masterStatus");
    elements.modelCodeInput = document.getElementById("modelCodeInput");
    elements.modelNameInput = document.getElementById("modelNameInput");
    elements.addModelBtn = document.getElementById("addModelBtn");
    elements.modelList = document.getElementById("modelList");
    elements.variantFieldSelect = document.getElementById("variantFieldSelect");
    elements.optionCodeInput = document.getElementById("optionCodeInput");
    elements.optionNameInput = document.getElementById("optionNameInput");
    elements.optionSwatchInput = document.getElementById("optionSwatchInput");
    elements.addOptionBtn = document.getElementById("addOptionBtn");
    elements.optionList = document.getElementById("optionList");
    elements.exportMasterBtn = document.getElementById("exportMasterBtn");
    elements.resetMasterBtn = document.getElementById("resetMasterBtn");
  }

  function bindEvents() {
    elements.masterToggleBtn.addEventListener("click", toggleMasterPanel);
    elements.resetBtn.addEventListener("click", resetConfiguration);
    elements.backToCategoriesBtn.addEventListener("click", function () {
      document.getElementById("categoryTitle").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    elements.copyCodeBtn.addEventListener("click", function () {
      var generated = buildGeneratedData();
      if (!generated.complete) {
        showFeedback("Completa todas las opciones antes de copiar el codigo.", true);
        return;
      }
      copyText(generated.code, "Codigo copiado.");
    });
    elements.copyDescriptionBtn.addEventListener("click", function () {
      var generated = buildGeneratedData();
      if (!generated.complete) {
        showFeedback("Completa todas las opciones antes de copiar la descripcion.", true);
        return;
      }
      copyText(generated.description, "Descripcion copiada.");
    });
    if (elements.saveHistoryBtn) {
      elements.saveHistoryBtn.addEventListener("click", saveCurrentToHistory);
    }
    if (elements.historySearch) {
      elements.historySearch.addEventListener("input", renderHistory);
    }
    if (elements.exportCsvBtn) {
      elements.exportCsvBtn.addEventListener("click", exportCsv);
    }
    if (elements.exportJsonBtn) {
      elements.exportJsonBtn.addEventListener("click", exportJson);
    }
    if (elements.clearHistoryBtn) {
      elements.clearHistoryBtn.addEventListener("click", clearHistory);
    }
    elements.masterCategorySelect.addEventListener("change", function () {
      state.activeMasterCategoryId = elements.masterCategorySelect.value;
      renderMasterPanel();
    });
    elements.variantFieldSelect.addEventListener("change", renderMasterOptions);
    elements.addModelBtn.addEventListener("click", addMasterModel);
    elements.addOptionBtn.addEventListener("click", addMasterOption);
    elements.exportMasterBtn.addEventListener("click", exportMasterDatabase);
    elements.resetMasterBtn.addEventListener("click", resetMasterDatabase);
  }

  function loadDatabase() {
    if (window.location.protocol === "file:") {
      return loadEmbeddedDatabase().catch(loadDatabaseFromFrame);
    }

    return fetch("data/database.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("No se pudo leer database.json");
        }
        return response.json();
      })
      .catch(loadDatabaseFromFrame)
      .catch(loadEmbeddedDatabase);
  }

  function loadDatabaseFromFrame() {
    return new Promise(function (resolve, reject) {
      var frame = document.getElementById("databaseFrame");
      var settled = false;
      var timer = window.setTimeout(function () {
        finish(reject, new Error("No se pudo leer la base local."));
      }, 1800);

      if (!frame) {
        finish(reject, new Error("No existe iframe de base local."));
        return;
      }

      frame.addEventListener("load", readFrame, { once: true });
      readFrame();

      function readFrame() {
        try {
          var frameDocument = frame.contentDocument || frame.contentWindow.document;
          var text = frameDocument.body ? frameDocument.body.textContent.trim() : "";
          if (!text) {
            return;
          }
          finish(resolve, JSON.parse(text));
        } catch (error) {
          finish(reject, error);
        }
      }

      function finish(callback, value) {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        callback(value);
      }
    });
  }

  function loadEmbeddedDatabase() {
    var fallback = document.getElementById("databaseFallback");
    if (!fallback || !fallback.textContent.trim()) {
      return Promise.reject(new Error("No existe base embebida."));
    }
    return Promise.resolve(JSON.parse(fallback.textContent));
  }

  function loadMasterDatabase(database) {
    try {
      var saved = JSON.parse(localStorage.getItem(MASTER_STORAGE_KEY));
      if (saved && saved.categories && saved.sharedOptions) {
        syncCategoryImages(saved, database);
        return saved;
      }
    } catch (error) {
      localStorage.removeItem(MASTER_STORAGE_KEY);
    }
    return database;
  }

  function syncCategoryImages(savedDatabase, bundledDatabase) {
    bundledDatabase.categories.forEach(function (bundledCategory) {
      var savedCategory = savedDatabase.categories.find(function (category) {
        return category.id === bundledCategory.id;
      });
      if (savedCategory) {
        savedCategory.image = bundledCategory.image;
        if (bundledCategory.id === "baneras" || bundledCategory.id === "receptaculos" || bundledCategory.id === "hidromasajes" || bundledCategory.id === "mini-piscinas") {
          savedCategory.models = cloneData(bundledCategory.models);
          savedCategory.fields = cloneData(bundledCategory.fields);
          savedCategory.codeOrder = cloneData(bundledCategory.codeOrder);
          savedCategory.descriptionMode = bundledCategory.descriptionMode;
        }
      }
    });
    syncBundledSharedOptions(savedDatabase, bundledDatabase);
    if (bundledDatabase.brand && savedDatabase.brand) {
      savedDatabase.brand.placeholderImage = bundledDatabase.brand.placeholderImage;
      savedDatabase.brand.logo = bundledDatabase.brand.logo;
    }
  }

  function syncBundledSharedOptions(savedDatabase, bundledDatabase) {
    [
      "medidasBaneras",
      "tipoBaneras",
      "materialBaneras",
      "colorBaneras",
      "terminacionBaneras",
      "desbordeDesagoteBaneras",
      "manoBaneras",
      "medidasReceptaculos",
      "tipoReceptaculos",
      "materialReceptaculos",
      "colorReceptaculos",
      "terminacionReceptaculos",
      "desagoteReceptaculos"
    ].forEach(function (source) {
      if (bundledDatabase.sharedOptions[source]) {
        savedDatabase.sharedOptions[source] = cloneData(bundledDatabase.sharedOptions[source]);
      }
    });
  }

  function persistMasterDatabase(message) {
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(state.database));
    renderCategories();
    renderMasterPanel();
    if (state.activeCategory) {
      var currentCategory = findCategory(state.activeCategory.id);
      state.activeCategory = currentCategory || null;
      if (state.activeCategory) {
        Object.keys(state.selections).forEach(function (fieldId) {
          var field = state.activeCategory.fields.find(function (item) {
            return item.id === fieldId;
          });
          if (field && !findOption(state.activeCategory, field, state.selections[fieldId])) {
            delete state.selections[fieldId];
          }
        });
        renderOptionSections();
      }
    }
    updatePreview();
    showMasterStatus(message || "Maestra actualizada.");
  }

  function renderCategories() {
    elements.categoryGrid.innerHTML = "";
    state.database.categories.forEach(function (category) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "category-card";
      card.dataset.categoryId = category.id;
      card.innerHTML =
        '<img src="' + escapeAttribute(category.image || state.database.brand.placeholderImage) + '" alt="">' +
        '<span class="category-card-body">' +
        '<h3>' + escapeHtml(category.name) + "</h3>" +
        "<p>" + escapeHtml(category.description) + "</p>" +
        "</span>" +
        '<span class="category-card-footer">' +
        "<b>" + escapeHtml(category.displayCode || category.code) + "</b>" +
        "<span>Configurar</span>" +
        "</span>";
      card.addEventListener("click", function () {
        selectCategory(category.id);
      });
      elements.categoryGrid.appendChild(card);
    });
  }

  function toggleMasterPanel() {
    elements.masterSection.hidden = !elements.masterSection.hidden;
    elements.masterToggleBtn.textContent = elements.masterSection.hidden ? "Trabajar maestra" : "Cerrar maestra";
    if (!elements.masterSection.hidden) {
      renderMasterPanel();
      elements.masterSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderMasterPanel() {
    if (!state.database || !elements.masterSection) {
      return;
    }

    if (!state.activeMasterCategoryId && state.database.categories[0]) {
      state.activeMasterCategoryId = state.database.categories[0].id;
    }

    elements.masterCategorySelect.innerHTML = "";
    state.database.categories.forEach(function (category) {
      var option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name + " (" + (category.displayCode || category.code) + ")";
      option.selected = category.id === state.activeMasterCategoryId;
      elements.masterCategorySelect.appendChild(option);
    });

    renderMasterModels();
    renderMasterFieldSelect();
    renderMasterOptions();
  }

  function renderMasterModels() {
    var category = findCategory(state.activeMasterCategoryId);
    elements.modelList.innerHTML = "";
    if (!category) {
      return;
    }

    category.models.forEach(function (model, index) {
      var row = document.createElement("div");
      row.className = "master-row";
      row.innerHTML =
        '<input type="text" value="' + escapeAttribute(model.code) + '" aria-label="Codigo de modelo">' +
        '<input type="text" value="' + escapeAttribute(model.name) + '" aria-label="Nombre de modelo">' +
        '<button type="button" class="secondary-button" data-action="save">Guardar</button>' +
        '<button type="button" class="danger-button" data-action="delete">Eliminar</button>';

      row.querySelector('[data-action="save"]').addEventListener("click", function () {
        var inputs = row.querySelectorAll("input");
        updateMasterModel(index, inputs[0].value, inputs[1].value);
      });
      row.querySelector('[data-action="delete"]').addEventListener("click", function () {
        deleteMasterModel(index);
      });
      elements.modelList.appendChild(row);
    });
  }

  function renderMasterFieldSelect() {
    var category = findCategory(state.activeMasterCategoryId);
    var currentValue = elements.variantFieldSelect.value;
    elements.variantFieldSelect.innerHTML = "";
    if (!category) {
      return;
    }

    category.fields.forEach(function (field) {
      if (field.source === "models") {
        return;
      }
      var option = document.createElement("option");
      option.value = field.id;
      option.textContent = field.label;
      elements.variantFieldSelect.appendChild(option);
    });

    if (currentValue && Array.prototype.some.call(elements.variantFieldSelect.options, function (option) {
      return option.value === currentValue;
    })) {
      elements.variantFieldSelect.value = currentValue;
    }
  }

  function renderMasterOptions() {
    var category = findCategory(state.activeMasterCategoryId);
    var field = category ? category.fields.find(function (item) {
      return item.id === elements.variantFieldSelect.value;
    }) : null;
    var options = field ? getFieldOptions(category, field) : [];

    elements.optionList.innerHTML = "";
    if (!field) {
      elements.optionList.innerHTML = '<p class="history-empty">Elegí un campo para editar sus variantes.</p>';
      return;
    }

    if (isSharedSource(field.source)) {
      var sharedNote = document.createElement("p");
      sharedNote.className = "master-note";
      sharedNote.textContent = "Este campo es compartido: si lo modificás, cambia en todas las categorías que usan la misma lista.";
      elements.optionList.appendChild(sharedNote);
    }

    options.forEach(function (option, index) {
      var row = document.createElement("div");
      row.className = "master-row option-master-row";
      row.innerHTML =
        '<input type="text" value="' + escapeAttribute(option.code) + '" aria-label="Codigo de variante">' +
        '<input type="text" value="' + escapeAttribute(option.name) + '" aria-label="Nombre de variante">' +
        '<input type="color" value="' + escapeAttribute(option.swatch || "#ffffff") + '" aria-label="Color de variante">' +
        '<button type="button" class="secondary-button" data-action="save">Guardar</button>' +
        '<button type="button" class="danger-button" data-action="delete">Eliminar</button>';

      row.querySelector('[data-action="save"]').addEventListener("click", function () {
        var inputs = row.querySelectorAll("input");
        updateMasterOption(field, index, inputs[0].value, inputs[1].value, inputs[2].value);
      });
      row.querySelector('[data-action="delete"]').addEventListener("click", function () {
        deleteMasterOption(field, index);
      });
      elements.optionList.appendChild(row);
    });
  }

  function addMasterModel() {
    var category = findCategory(state.activeMasterCategoryId);
    var code = cleanCode(elements.modelCodeInput.value);
    var name = elements.modelNameInput.value.trim();
    if (!category || !code || !name) {
      showMasterStatus("Completá código y nombre del modelo.", true);
      return;
    }
    if (category.models.some(function (model) { return model.code === code; })) {
      showMasterStatus("Ya existe un modelo con ese código.", true);
      return;
    }
    category.models.push({ code: code, name: name });
    elements.modelCodeInput.value = "";
    elements.modelNameInput.value = "";
    persistMasterDatabase("Modelo agregado a la maestra.");
  }

  function updateMasterModel(index, codeValue, nameValue) {
    var category = findCategory(state.activeMasterCategoryId);
    var code = cleanCode(codeValue);
    var name = nameValue.trim();
    if (!category || !code || !name) {
      showMasterStatus("Código y nombre no pueden quedar vacíos.", true);
      return;
    }
    if (category.models.some(function (model, modelIndex) { return modelIndex !== index && model.code === code; })) {
      showMasterStatus("Ese código ya está usado por otro modelo.", true);
      return;
    }
    category.models[index] = { code: code, name: name };
    persistMasterDatabase("Modelo actualizado.");
  }

  function deleteMasterModel(index) {
    var category = findCategory(state.activeMasterCategoryId);
    if (!category || !window.confirm("Eliminar este modelo de la maestra?")) {
      return;
    }
    category.models.splice(index, 1);
    persistMasterDatabase("Modelo eliminado.");
  }

  function addMasterOption() {
    var category = findCategory(state.activeMasterCategoryId);
    var field = category ? category.fields.find(function (item) {
      return item.id === elements.variantFieldSelect.value;
    }) : null;
    var list = field ? getFieldOptions(category, field) : null;
    var code = cleanCode(elements.optionCodeInput.value);
    var name = elements.optionNameInput.value.trim();
    if (!field || !list || !code || !name) {
      showMasterStatus("Completá código y nombre de la variante.", true);
      return;
    }
    if (list.some(function (option) { return option.code === code; })) {
      showMasterStatus("Ya existe una variante con ese código.", true);
      return;
    }
    list.push(buildMasterOption(code, name, elements.optionSwatchInput.value, field));
    elements.optionCodeInput.value = "";
    elements.optionNameInput.value = "";
    persistMasterDatabase("Variante agregada a la maestra.");
  }

  function updateMasterOption(field, index, codeValue, nameValue, swatchValue) {
    var category = findCategory(state.activeMasterCategoryId);
    var list = category ? getFieldOptions(category, field) : null;
    var code = cleanCode(codeValue);
    var name = nameValue.trim();
    if (!list || !code || !name) {
      showMasterStatus("Código y nombre no pueden quedar vacíos.", true);
      return;
    }
    if (list.some(function (option, optionIndex) { return optionIndex !== index && option.code === code; })) {
      showMasterStatus("Ese código ya está usado por otra variante.", true);
      return;
    }
    list[index] = buildMasterOption(code, name, swatchValue, field);
    persistMasterDatabase("Variante actualizada.");
  }

  function deleteMasterOption(field, index) {
    var category = findCategory(state.activeMasterCategoryId);
    var list = category ? getFieldOptions(category, field) : null;
    if (!list || !window.confirm("Eliminar esta variante de la maestra?")) {
      return;
    }
    list.splice(index, 1);
    persistMasterDatabase("Variante eliminada.");
  }

  function buildMasterOption(code, name, swatch, field) {
    var option = { code: code, name: name };
    if (field.id === "color" && swatch) {
      option.swatch = swatch;
    }
    return option;
  }

  function exportMasterDatabase() {
    downloadFile("aquaglass-database-maestra.json", "application/json;charset=utf-8", JSON.stringify(state.database, null, 2));
    showMasterStatus("Maestra exportada en JSON.");
  }

  function resetMasterDatabase() {
    if (!window.confirm("Restaurar la base original y borrar los cambios locales de maestra?")) {
      return;
    }
    localStorage.removeItem(MASTER_STORAGE_KEY);
    state.database = cloneData(state.originalDatabase);
    state.activeMasterCategoryId = state.database.categories[0] ? state.database.categories[0].id : "";
    state.activeCategory = null;
    state.selections = {};
    renderCategories();
    renderMasterPanel();
    resetConfiguration();
    showMasterStatus("Base original restaurada.");
  }

  function selectCategory(categoryId) {
    var category = findCategory(categoryId);
    if (!category) {
      return;
    }

    state.activeCategory = category;
    state.selections = {};
    renderOptionSections();
    updateActiveCategoryCards();
    updatePreview();
    document.querySelector(".configurator").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetConfiguration() {
    state.activeCategory = null;
    state.selections = {};
    updateActiveCategoryCards();
    elements.configTitle.textContent = "Configuracion";
    elements.stepLabel.textContent = "Paso 2";
    elements.optionSections.innerHTML = '<p class="history-empty">Selecciona una familia para ver modelos y variantes disponibles.</p>';
    updatePreview();
  }

  function renderOptionSections() {
    var category = state.activeCategory;
    elements.configTitle.textContent = category.name;
    elements.stepLabel.textContent = "Paso 2 en adelante";
    elements.optionSections.innerHTML = "";
    applySingleOptionDefaults(category);

    var visibleStep = 2;
    category.fields.forEach(function (field) {
      var options = getFieldOptions(category, field);
      if (options.length === 1) {
        return;
      }

      var group = document.createElement("section");
      group.className = "option-group missing";
      group.id = "field-" + field.id;
      group.dataset.fieldId = field.id;

      var heading = document.createElement("div");
      heading.className = "option-heading";
      heading.innerHTML =
        "<h3>" + escapeHtml(field.label) + "</h3>" +
        "<span>Paso " + String(visibleStep) + "</span>";
      visibleStep += 1;

      var grid = document.createElement("div");
      grid.className = "option-grid";

      options.forEach(function (option) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "option-card";
        button.dataset.fieldId = field.id;
        button.dataset.optionCode = option.code;
        button.innerHTML = buildOptionMarkup(option);
        button.addEventListener("click", function () {
          selectOption(category, field, option);
        });
        grid.appendChild(button);
      });

      group.appendChild(heading);
      group.appendChild(grid);
      elements.optionSections.appendChild(group);
    });
  }

  function applySingleOptionDefaults(category) {
    category.fields.forEach(function (field) {
      var options = getFieldOptions(category, field);
      if (options.length === 1) {
        state.selections[field.id] = options[0].code;
      }
    });
    pruneInvalidSelections(category);
  }

  function selectOption(category, field, option) {
    state.selections[field.id] = option.code;
    pruneInvalidSelections(category);
    updatePreview();
  }

  function pruneInvalidSelections(category) {
    category.fields.forEach(function (field) {
      if (state.selections[field.id] && !findOption(category, field, state.selections[field.id])) {
        delete state.selections[field.id];
      }
    });
  }

  function buildOptionMarkup(option) {
    var swatch = option.swatch
      ? '<span class="swatch" style="background:' + escapeAttribute(option.swatch) + '"></span>'
      : "";
    return '<span class="option-code">' + escapeHtml(option.code) + "</span>" +
      '<span class="option-name swatch-row">' + swatch + escapeHtml(option.name) + "</span>";
  }

  function updatePreview() {
    var generated = buildGeneratedData();
    var category = state.activeCategory;

    elements.heroCode.textContent = generated.code;
    elements.generatedCode.textContent = generated.code;
    elements.generatedDescription.textContent = generated.description;
    elements.summaryCategory.textContent = category ? (category.displayCode || category.code) : "---";
    elements.summaryImage.src = category ? (category.image || state.database.brand.placeholderImage) : "assets/placeholder-product.png";
    elements.progressText.textContent = generated.complete
      ? "Configuracion completa"
      : "Faltan completar " + generated.missingCount + " opciones";
    elements.progressPercent.textContent = generated.progress + "%";
    elements.progressBar.style.width = generated.progress + "%";
    if (elements.saveHistoryBtn) {
      elements.saveHistoryBtn.disabled = !generated.complete;
    }
    elements.missingAlert.hidden = generated.complete || !category;
    elements.missingAlert.textContent = generated.complete ? "" : "Faltan completar: " + generated.missingLabels.join(", ") + ".";

    renderSelectedList(generated);
    updateBreadcrumb(generated);
    updateOptionCards();
  }

  function buildGeneratedData() {
    var category = state.activeCategory;
    if (!category) {
      return {
        code: "---",
        description: "Selecciona una familia para comenzar.",
        complete: false,
        missingCount: 0,
        missingLabels: [],
        progress: 0,
        selectedItems: []
      };
    }

    var selectedItems = category.fields.map(function (field) {
      return {
        field: field,
        option: findOption(category, field, state.selections[field.id])
      };
    });

    var missing = selectedItems.filter(function (item) {
      return !item.option;
    });
    var complete = missing.length === 0;
    var selectedCount = selectedItems.length - missing.length;
    var progress = Math.round((selectedCount / category.fields.length) * 100);
    var code = complete ? buildCode(category) : buildPartialCode(category);
    var description = complete ? buildDescription(category, selectedItems) : "Completa las opciones para generar la descripcion comercial.";
    var model = selectedItems.find(function (item) {
      return item.field.id === "modelo";
    });

    return {
      category: category,
      modelName: model && model.option ? model.option.name : "",
      code: code,
      description: description,
      complete: complete,
      missingCount: missing.length,
      missingLabels: missing.map(function (item) { return item.field.label; }),
      progress: progress,
      selectedItems: selectedItems
    };
  }

  function buildCode(category) {
    return category.codeOrder.map(function (part) {
      if (part === "category") {
        return category.code;
      }
      return state.selections[part];
    }).join("-");
  }

  function buildPartialCode(category) {
    return category.codeOrder.map(function (part) {
      if (part === "category") {
        return category.code;
      }
      return state.selections[part] || "___";
    }).join("-");
  }

  function buildDescription(category, selectedItems) {
    if (category.descriptionMode === "compact") {
      return buildCompactDescription(category, selectedItems);
    }

    var model = getSelectedOption(selectedItems, "modelo");
    var medida = getSelectedOption(selectedItems, "medida");
    var fragments = [category.singularName + (model ? " " + model.name : "")];

    if (getSelectedOption(selectedItems, "tipo")) {
      fragments.push(getSelectedOption(selectedItems, "tipo").name.toLowerCase());
    }
    if (medida) {
      fragments.push(medida.name);
    }

    selectedItems.forEach(function (item) {
      var id = item.field.id;
      if (id === "modelo" || id === "tipo" || id === "medida" || id === "amedida") {
        return;
      }
      if (!item.option) {
        return;
      }
      var label = item.field.descriptionLabel || item.field.label.toLowerCase();
      fragments.push(label + " " + item.option.name);
    });

    return sentenceCase(fragments.join(", ")) + ".";
  }

  function buildCompactDescription(category, selectedItems) {
    var fragments = [];
    selectedItems.forEach(function (item) {
      if (item.option) {
        fragments.push(item.option.name);
      }
    });
    return [category.singularName].concat(fragments).join(" ") + ".";
  }

  function renderSelectedList(generated) {
    elements.selectedList.innerHTML = "";
    if (!generated.category) {
      elements.selectedList.innerHTML = "<div><dt>Producto</dt><dd>Sin seleccionar</dd></div>";
      return;
    }

    generated.selectedItems.forEach(function (item) {
      var row = document.createElement("div");
      row.innerHTML = "<dt>" + escapeHtml(item.field.label) + "</dt><dd>" +
        escapeHtml(item.option ? item.option.name : "Pendiente") + "</dd>";
      elements.selectedList.appendChild(row);
    });
  }

  function updateBreadcrumb(generated) {
    var crumbs = ["Inicio"];
    if (generated.category) {
      crumbs.push(generated.category.name);
    }
    if (generated.modelName) {
      crumbs.push(generated.modelName);
    }
    if (generated.category) {
      crumbs.push("Configuracion");
    }
    elements.breadcrumb.innerHTML = crumbs.map(function (crumb) {
      return "<span>" + escapeHtml(crumb) + "</span>";
    }).join("");
  }

  function updateOptionCards() {
    document.querySelectorAll(".option-card").forEach(function (button) {
      var fieldId = button.dataset.fieldId;
      var optionCode = button.dataset.optionCode;
      button.classList.toggle("selected", state.selections[fieldId] === optionCode);
    });

    document.querySelectorAll(".option-group").forEach(function (group) {
      group.classList.toggle("missing", !state.selections[group.dataset.fieldId]);
    });
  }

  function updateActiveCategoryCards() {
    document.querySelectorAll(".category-card").forEach(function (card) {
      card.classList.toggle("active", Boolean(state.activeCategory && card.dataset.categoryId === state.activeCategory.id));
    });
  }

  function getFieldOptions(category, field) {
    var options;
    if (field.source === "models") {
      options = category.models || [];
    } else {
      options = state.database.sharedOptions[field.source] || [];
    }
    return getFilteredFieldOptions(category, field, options);
  }

  function getFilteredFieldOptions(category, field, options) {
    return options;
  }

  function findOption(category, field, code) {
    if (!code) {
      return null;
    }
    return getFieldOptions(category, field).find(function (option) {
      return option.code === code;
    }) || null;
  }

  function getSelectedOption(selectedItems, id) {
    var item = selectedItems.find(function (entry) {
      return entry.field.id === id;
    });
    return item ? item.option : null;
  }

  function findCategory(categoryId) {
    return state.database.categories.find(function (category) {
      return category.id === categoryId;
    });
  }

  function saveCurrentToHistory() {
    var generated = buildGeneratedData();
    if (!generated.complete) {
      showFeedback("No se puede guardar una configuracion incompleta.", true);
      updatePreview();
      return;
    }

    var now = new Date();
    var record = {
      id: String(now.getTime()),
      date: now.toLocaleDateString("es-AR"),
      time: now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      category: generated.category.name,
      categoryCode: generated.category.code,
      model: generated.modelName,
      code: generated.code,
      description: generated.description,
      selections: generated.selectedItems.reduce(function (accumulator, item) {
        accumulator[item.field.id] = {
          code: item.option.code,
          name: item.option.name
        };
        return accumulator;
      }, {})
    };

    state.history.unshift(record);
    state.history = state.history.slice(0, MAX_HISTORY);
    persistHistory();
    renderHistory();
    showFeedback("Configuracion guardada en el historial.");
  }

  function loadHistory() {
    try {
      state.history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
      state.history = [];
    }
  }

  function persistHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  }

  function renderHistory() {
    if (!elements.historyList || !elements.historySearch) {
      return;
    }
    var query = normalizeText(elements.historySearch.value);
    var records = state.history.filter(function (record) {
      var searchable = normalizeText([
        record.code,
        record.category,
        record.model,
        record.description
      ].join(" "));
      return searchable.indexOf(query) !== -1;
    }).slice(0, MAX_HISTORY);

    elements.historyList.innerHTML = "";

    if (records.length === 0) {
      elements.historyList.innerHTML = '<p class="history-empty">Sin configuraciones guardadas.</p>';
      return;
    }

    records.forEach(function (record) {
      var card = document.createElement("article");
      card.className = "history-card";
      card.innerHTML =
        "<div>" +
        "<strong>" + escapeHtml(record.code) + "</strong>" +
        "<p>" + escapeHtml(record.description) + "</p>" +
        '<span class="history-meta">' +
        "<span>" + escapeHtml(record.date) + " " + escapeHtml(record.time) + "</span>" +
        "<span>" + escapeHtml(record.category) + "</span>" +
        "<span>" + escapeHtml(record.model) + "</span>" +
        "</span>" +
        "</div>" +
        '<div class="history-card-actions">' +
        '<button type="button" class="secondary-button" data-action="copy" data-id="' + escapeAttribute(record.id) + '">Copiar</button>' +
        '<button type="button" class="danger-button" data-action="delete" data-id="' + escapeAttribute(record.id) + '">Eliminar</button>' +
        "</div>";
      elements.historyList.appendChild(card);
    });

    elements.historyList.querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", function () {
        var record = findHistoryRecord(button.dataset.id);
        if (!record) {
          return;
        }
        if (button.dataset.action === "copy") {
          copyText(record.code, "Codigo copiado desde historial.");
        }
        if (button.dataset.action === "delete") {
          deleteHistoryRecord(record.id);
        }
      });
    });
  }

  function findHistoryRecord(id) {
    return state.history.find(function (record) {
      return record.id === id;
    });
  }

  function deleteHistoryRecord(id) {
    state.history = state.history.filter(function (record) {
      return record.id !== id;
    });
    persistHistory();
    renderHistory();
  }

  function clearHistory() {
    if (state.history.length === 0) {
      return;
    }
    if (!window.confirm("Vaciar todo el historial local?")) {
      return;
    }
    state.history = [];
    persistHistory();
    renderHistory();
    showFeedback("Historial vaciado.");
  }

  function exportCsv() {
    var rows = [["Fecha", "Hora", "Categoria", "Modelo", "Codigo", "Descripcion"]].concat(state.history.map(function (record) {
      return [record.date, record.time, record.category, record.model, record.code, record.description];
    }));
    var csv = rows.map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\r\n");
    downloadFile("aquaglass-historial.csv", "text/csv;charset=utf-8", "\uFEFF" + csv);
  }

  function exportJson() {
    downloadFile("aquaglass-historial.json", "application/json;charset=utf-8", JSON.stringify(state.history, null, 2));
  }

  function downloadFile(filename, mimeType, content) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function copyText(text, message) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showFeedback(message);
      }).catch(function () {
        fallbackCopy(text, message);
      });
      return;
    }
    fallbackCopy(text, message);
  }

  function fallbackCopy(text, message) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showFeedback(message);
  }

  function showFeedback(message, isWarning) {
    elements.feedback.textContent = message;
    elements.feedback.style.color = isWarning ? "var(--warning)" : "var(--success)";
    window.clearTimeout(showFeedback.timer);
    showFeedback.timer = window.setTimeout(function () {
      elements.feedback.textContent = "";
    }, 2600);
  }

  function showMasterStatus(message, isWarning) {
    elements.masterStatus.textContent = message;
    elements.masterStatus.style.color = isWarning ? "var(--warning)" : "var(--success)";
    window.clearTimeout(showMasterStatus.timer);
    showMasterStatus.timer = window.setTimeout(function () {
      elements.masterStatus.textContent = "";
    }, 3200);
  }

  function cleanCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isSharedSource(source) {
    if (!source || source === "models") {
      return false;
    }
    var usageCount = 0;
    state.database.categories.forEach(function (category) {
      category.fields.forEach(function (field) {
        if (field.source === source) {
          usageCount += 1;
        }
      });
    });
    return usageCount > 1;
  }

  function csvCell(value) {
    return '"' + String(value || "").replace(/"/g, '""') + '"';
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function sentenceCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
}());
