(function (global) {
  "use strict";

  function asText(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function normalize(value) {
    return asText(value).toLowerCase();
  }

  function uniqueFieldValues(rows, field) {
    var set = new Set();
    rows.forEach(function (row) {
      set.add(asText(row[field]).trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }

  function setCellContent(td, content) {
    if (content === null || content === undefined) {
      td.textContent = "";
      return;
    }

    if (typeof content === "string" && /<\/?[a-z][\s\S]*>/i.test(content)) {
      td.innerHTML = content;
      return;
    }

    td.textContent = asText(content);
  }

  function createRowApi(rowData) {
    return {
      getData: function () {
        return rowData;
      },
    };
  }

  function createCellApi(rowApi, field) {
    return {
      getValue: function () {
        return rowApi.getData()[field];
      },
      getRow: function () {
        return rowApi;
      },
    };
  }

  function Tabulator(selector, options) {
    this.container = typeof selector === "string" ? document.querySelector(selector) : selector;
    this.options = options || {};
    this.columns = Array.isArray(this.options.columns) ? this.options.columns : [];
    this.data = Array.isArray(this.options.data) ? this.options.data.slice() : [];

    this.placeholder = this.options.placeholder || "Nenhum registro encontrado";
    this.filters = {};
    this.sortField = null;
    this.sortDir = "asc";
    this.page = 1;
    this.paginationEnabled = this.options.pagination === "local";
    this.pageSizes =
      Array.isArray(this.options.paginationSizeSelector) && this.options.paginationSizeSelector.length
        ? this.options.paginationSizeSelector.slice()
        : [10, 25, 50];
    this.pageSize = Number(this.options.paginationSize || this.pageSizes[0] || 10);

    if (Array.isArray(this.options.initialSort) && this.options.initialSort.length > 0) {
      var firstSort = this.options.initialSort[0];
      if (firstSort && firstSort.column) {
        this.sortField = firstSort.column;
        this.sortDir = firstSort.dir === "desc" ? "desc" : "asc";
      }
    }

    this.build();
    this.refresh();
  }

  Tabulator.prototype.build = function () {
    if (!this.container) return;

    this.container.innerHTML = "";
    this.container.classList.add("tabulator-lite-wrapper");

    if (this.paginationEnabled) {
      var topbar = document.createElement("div");
      topbar.className = "tabulator-lite-topbar";
      this.topbarInfo = document.createElement("div");
      this.topbarInfo.className = "tabulator-lite-topbar-info";
      this.topbarInfo.textContent = "Carregando...";

      var topbarControls = document.createElement("div");
      topbarControls.className = "tabulator-lite-topbar-controls";

      var pageSizeLabel = document.createElement("label");
      pageSizeLabel.textContent = "Itens por página";
      pageSizeLabel.className = "tabulator-lite-label";

      this.pageSizeSelect = document.createElement("select");
      this.pageSizeSelect.className = "tabulator-lite-select";
      this.pageSizes.forEach(
        function (size) {
          var opt = document.createElement("option");
          opt.value = String(size);
          opt.textContent = String(size);
          if (Number(size) === Number(this.pageSize)) {
            opt.selected = true;
          }
          this.pageSizeSelect.appendChild(opt);
        }.bind(this)
      );

      this.pageSizeSelect.addEventListener(
        "change",
        function () {
          this.pageSize = Math.max(1, Number(this.pageSizeSelect.value) || this.pageSize);
          this.page = 1;
          this.refresh();
        }.bind(this)
      );

      pageSizeLabel.appendChild(this.pageSizeSelect);
      topbarControls.appendChild(pageSizeLabel);
      topbar.appendChild(this.topbarInfo);
      topbar.appendChild(topbarControls);
      this.container.appendChild(topbar);
    }

    this.table = document.createElement("table");
    this.table.className = "tabulator-lite";

    this.thead = document.createElement("thead");
    this.headRow = document.createElement("tr");
    this.filterRow = document.createElement("tr");
    this.filterRow.className = "tabulator-lite-filter-row";

    var hasAnyFilter = false;
    this.columns.forEach(
      function (col) {
        var th = document.createElement("th");
        th.textContent = col.title || "";

        if (col.field) {
          th.dataset.field = col.field;
        }

        if (col.headerSort !== false && col.field) {
          th.classList.add("tabulator-lite-sortable");
          th.addEventListener(
            "click",
            function () {
              if (this.sortField === col.field) {
                this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
              } else {
                this.sortField = col.field;
                this.sortDir = "asc";
              }
              this.refresh();
            }.bind(this)
          );
        }

        this.headRow.appendChild(th);

        var filterCell = document.createElement("th");
        var filterType = col.headerFilter;
        if (filterType === "input" && col.field) {
          hasAnyFilter = true;
          var input = document.createElement("input");
          input.type = "text";
          input.className = "tabulator-lite-filter-input";
          input.placeholder = "Filtrar...";
          input.addEventListener(
            "input",
            function () {
              this.filters[col.field] = {
                type: "input",
                value: normalize(input.value.trim()),
              };
              this.page = 1;
              this.refresh();
            }.bind(this)
          );
          filterCell.appendChild(input);
        } else if (filterType === "list" && col.field) {
          hasAnyFilter = true;
          var select = document.createElement("select");
          select.className = "tabulator-lite-filter-input";
          var optAll = document.createElement("option");
          optAll.value = "";
          optAll.textContent = "Todos";
          select.appendChild(optAll);

          var values = uniqueFieldValues(this.data, col.field);
          values.forEach(function (value) {
            var opt = document.createElement("option");
            opt.value = normalize(value);
            opt.textContent = asText(value);
            select.appendChild(opt);
          });

          select.addEventListener(
            "change",
            function () {
              this.filters[col.field] = {
                type: "list",
                value: normalize(select.value),
              };
              this.page = 1;
              this.refresh();
            }.bind(this)
          );
          filterCell.appendChild(select);
        }

        this.filterRow.appendChild(filterCell);
      }.bind(this)
    );

    this.thead.appendChild(this.headRow);
    if (hasAnyFilter) {
      this.thead.appendChild(this.filterRow);
    }
    this.table.appendChild(this.thead);

    this.tbody = document.createElement("tbody");
    this.table.appendChild(this.tbody);
    this.container.appendChild(this.table);

    if (this.paginationEnabled) {
      this.footer = document.createElement("div");
      this.footer.className = "tabulator-lite-footer";

      this.footerInfo = document.createElement("div");
      this.footerInfo.className = "tabulator-lite-footer-info";

      var nav = document.createElement("div");
      nav.className = "tabulator-lite-pagination";

      this.btnFirst = document.createElement("button");
      this.btnFirst.type = "button";
      this.btnFirst.textContent = "Primeira";
      this.btnFirst.addEventListener(
        "click",
        function () {
          this.page = 1;
          this.refresh();
        }.bind(this)
      );

      this.btnPrev = document.createElement("button");
      this.btnPrev.type = "button";
      this.btnPrev.textContent = "Anterior";
      this.btnPrev.addEventListener(
        "click",
        function () {
          this.page = Math.max(1, this.page - 1);
          this.refresh();
        }.bind(this)
      );

      this.pageIndicator = document.createElement("span");
      this.pageIndicator.className = "tabulator-lite-page-indicator";
      this.pageIndicator.textContent = "Página 1";

      this.btnNext = document.createElement("button");
      this.btnNext.type = "button";
      this.btnNext.textContent = "Próxima";
      this.btnNext.addEventListener(
        "click",
        function () {
          this.page = Math.min(this.totalPages || 1, this.page + 1);
          this.refresh();
        }.bind(this)
      );

      this.btnLast = document.createElement("button");
      this.btnLast.type = "button";
      this.btnLast.textContent = "Última";
      this.btnLast.addEventListener(
        "click",
        function () {
          this.page = Math.max(1, this.totalPages || 1);
          this.refresh();
        }.bind(this)
      );

      nav.appendChild(this.btnFirst);
      nav.appendChild(this.btnPrev);
      nav.appendChild(this.pageIndicator);
      nav.appendChild(this.btnNext);
      nav.appendChild(this.btnLast);

      this.footer.appendChild(this.footerInfo);
      this.footer.appendChild(nav);
      this.container.appendChild(this.footer);
    }
  };

  Tabulator.prototype.applyFilters = function (rows) {
    var activeFilters = this.filters;
    return rows.filter(function (row) {
      for (var key in activeFilters) {
        if (!Object.prototype.hasOwnProperty.call(activeFilters, key)) continue;

        var rule = activeFilters[key];
        if (!rule || !rule.value) continue;

        var rowValue = normalize(row[key]);
        if (rule.type === "input") {
          if (rowValue.indexOf(rule.value) === -1) {
            return false;
          }
        } else if (rule.type === "list") {
          if (rowValue !== rule.value) {
            return false;
          }
        }
      }
      return true;
    });
  };

  Tabulator.prototype.applySort = function (rows) {
    if (!this.sortField) {
      return rows.slice();
    }

    var field = this.sortField;
    var dir = this.sortDir === "desc" ? -1 : 1;

    return rows.slice().sort(function (a, b) {
      var av = a[field];
      var bv = b[field];

      if (av === null || av === undefined) av = "";
      if (bv === null || bv === undefined) bv = "";

      var avNum = Number(av);
      var bvNum = Number(bv);
      var bothNumbers = Number.isFinite(avNum) && Number.isFinite(bvNum);

      if (bothNumbers) {
        if (avNum < bvNum) return -1 * dir;
        if (avNum > bvNum) return 1 * dir;
        return 0;
      }

      var avText = normalize(av);
      var bvText = normalize(bv);
      if (avText < bvText) return -1 * dir;
      if (avText > bvText) return 1 * dir;
      return 0;
    });
  };

  Tabulator.prototype.paginate = function (rows) {
    if (!this.paginationEnabled) {
      this.totalPages = 1;
      return rows;
    }

    var total = rows.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    this.page = Math.min(Math.max(1, this.page), this.totalPages);
    var start = (this.page - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  };

  Tabulator.prototype.renderRows = function (rows) {
    this.tbody.innerHTML = "";

    if (!rows.length) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = Math.max(1, this.columns.length);
      emptyCell.className = "tabulator-lite-empty";
      emptyCell.textContent = this.placeholder;
      emptyRow.appendChild(emptyCell);
      this.tbody.appendChild(emptyRow);
      return;
    }

    rows.forEach(
      function (rowData) {
        var tr = document.createElement("tr");
        var rowApi = createRowApi(rowData);

        this.columns.forEach(function (col) {
          var td = document.createElement("td");
          var cellApi = createCellApi(rowApi, col.field);
          var content;

          if (typeof col.formatter === "function") {
            content = col.formatter(cellApi);
          } else if (col.field) {
            content = rowData[col.field];
          } else {
            content = "";
          }

          setCellContent(td, content);

          if (typeof col.cellClick === "function") {
            td.classList.add("tabulator-lite-clickable");
            td.addEventListener("click", function (event) {
              col.cellClick(event, cellApi);
            });
          }

          tr.appendChild(td);
        });

        this.tbody.appendChild(tr);
      }.bind(this)
    );
  };

  Tabulator.prototype.updateSortHeaders = function () {
    var headers = this.headRow.querySelectorAll("th[data-field]");
    headers.forEach(
      function (th) {
        th.classList.remove("is-sort-asc", "is-sort-desc");
        if (th.dataset.field === this.sortField) {
          th.classList.add(this.sortDir === "desc" ? "is-sort-desc" : "is-sort-asc");
        }
      }.bind(this)
    );
  };

  Tabulator.prototype.updatePagination = function (totalFiltered) {
    if (!this.paginationEnabled) {
      return;
    }

    var start = totalFiltered === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    var end = Math.min(totalFiltered, this.page * this.pageSize);

    this.footerInfo.textContent = "Mostrando " + start + "-" + end + " de " + totalFiltered;
    this.topbarInfo.textContent = "Total filtrado: " + totalFiltered;
    this.pageIndicator.textContent = "Página " + this.page + " de " + this.totalPages;

    var disablePrev = this.page <= 1;
    var disableNext = this.page >= this.totalPages;

    this.btnFirst.disabled = disablePrev;
    this.btnPrev.disabled = disablePrev;
    this.btnNext.disabled = disableNext;
    this.btnLast.disabled = disableNext;
  };

  Tabulator.prototype.refresh = function () {
    var filtered = this.applyFilters(this.data);
    var sorted = this.applySort(filtered);
    var paged = this.paginate(sorted);
    this.renderRows(paged);
    this.updateSortHeaders();
    this.updatePagination(filtered.length);
  };

  Tabulator.prototype.setData = function (rows) {
    this.data = Array.isArray(rows) ? rows.slice() : [];
    this.page = 1;
    this.refresh();
  };

  global.Tabulator = Tabulator;
})(window);
