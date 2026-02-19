(function (global) {
  "use strict";

  function toCanvas(input) {
    if (!input) return null;
    if (input.getContext) return input;
    if (input.canvas && input.canvas.getContext) return input.canvas;
    return null;
  }

  function number(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function fitCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(360, Math.floor(rect.width || canvas.clientWidth || 420));
    var height = Math.max(320, Math.floor(rect.height || canvas.clientHeight || 380));
    canvas.width = width;
    canvas.height = height;
  }

  function clear(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawDonutLegend(ctx, items, x, y, lineHeight) {
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    items.forEach(function (item, index) {
      var rowY = y + index * lineHeight;
      ctx.fillStyle = item.color;
      ctx.fillRect(x, rowY - 5, 10, 10);

      ctx.fillStyle = "#475569";
      ctx.fillText(item.text, x + 16, rowY);
    });
  }

  function drawDoughnut(ctx, canvas, labels, values, colors) {
    var total = values.reduce(function (sum, value) {
      return sum + Math.max(0, value);
    }, 0);

    if (total <= 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Sem dados para o gráfico", canvas.width / 2, canvas.height / 2);
      return;
    }

    var width = canvas.width;
    var height = canvas.height;
    var cx = width * 0.34;
    var cy = height * 0.5;
    var radius = Math.min(width, height) * 0.26;
    var lineWidth = radius * 0.46;
    var start = -Math.PI / 2;

    ctx.lineCap = "butt";
    ctx.lineWidth = lineWidth;

    values.forEach(function (value, index) {
      var safeValue = Math.max(0, value);
      if (!safeValue) return;
      var angle = (safeValue / total) * (Math.PI * 2);
      ctx.beginPath();
      ctx.strokeStyle = colors[index] || "#64748b";
      ctx.arc(cx, cy, radius, start, start + angle);
      ctx.stroke();
      start += angle;
    });

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(total), cx, cy - 2);
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Arial";
    ctx.fillText("Total de OS", cx, cy + 16);

    var legendItems = labels.map(function (label, index) {
      var v = Math.max(0, values[index] || 0);
      var percent = total > 0 ? Math.round((v / total) * 100) : 0;
      return {
        color: colors[index] || "#64748b",
        text: label + ": " + v + " (" + percent + "%)",
      };
    });

    drawDonutLegend(ctx, legendItems, width * 0.62, Math.max(26, cy - 52), 22);
  }

  function drawBar(ctx, canvas, labels, values, color) {
    var width = canvas.width;
    var height = canvas.height;
    var padding = { top: 22, right: 20, bottom: 48, left: 42 };
    var plotW = Math.max(1, width - padding.left - padding.right);
    var plotH = Math.max(1, height - padding.top - padding.bottom);
    var max = Math.max.apply(null, values.concat([1]));
    var stepY = max <= 6 ? 1 : Math.ceil(max / 5);
    var ticks = Math.max(2, Math.ceil(max / stepY));

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (var i = 0; i <= ticks; i += 1) {
      var y = padding.top + plotH - (i / ticks) * plotH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      var tickValue = Math.round((i / ticks) * max);
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(tickValue), padding.left - 6, y);
    }

    var slotW = plotW / Math.max(1, values.length);
    var barW = Math.max(14, slotW * 0.58);

    values.forEach(function (value, index) {
      var safeValue = Math.max(0, number(value, 0));
      var h = (safeValue / max) * plotH;
      var x = padding.left + index * slotW + (slotW - barW) / 2;
      var y = padding.top + plotH - h;

      ctx.fillStyle = color || "#3b82f6";
      ctx.fillRect(x, y, barW, h);

      ctx.fillStyle = "#1f2937";
      ctx.font = "11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(safeValue), x + barW / 2, y - 4);

      var label = String(labels[index] || "");
      var shortLabel = label.length > 12 ? label.slice(0, 12) + "..." : label;
      ctx.fillStyle = "#475569";
      ctx.textBaseline = "top";
      ctx.fillText(shortLabel, x + barW / 2, padding.top + plotH + 8);
    });
  }

  function Chart(canvasInput, config) {
    this.canvas = toCanvas(canvasInput);
    this.config = config || {};
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this._onResize = this.render.bind(this);
    if (this.canvas) {
      global.addEventListener("resize", this._onResize);
    }
    this.render();
  }

  Chart.prototype.render = function () {
    if (!this.canvas || !this.ctx) return;
    fitCanvas(this.canvas);
    clear(this.ctx, this.canvas);

    var type = (this.config && this.config.type) || "";
    var data = (this.config && this.config.data) || {};
    var labels = data.labels || [];
    var datasets = data.datasets || [];
    var ds = datasets[0] || {};
    var values = (ds.data || []).map(function (value) {
      return number(value, 0);
    });

    if (type === "doughnut") {
      drawDoughnut(this.ctx, this.canvas, labels, values, ds.backgroundColor || []);
      return;
    }

    if (type === "bar") {
      drawBar(this.ctx, this.canvas, labels, values, ds.backgroundColor || "#3b82f6");
    }
  };

  Chart.prototype.destroy = function () {
    if (this.canvas) {
      global.removeEventListener("resize", this._onResize);
    }
    if (this.ctx && this.canvas) {
      clear(this.ctx, this.canvas);
    }
  };

  global.Chart = Chart;
})(window);
