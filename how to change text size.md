# How to change text size

这份说明只讲 **后端生成图片时的字体控制**。

当前四张图的文字样式都在：

- `backend/app/main.py`

四张图分别是：

- `fit_overlay.png`
- `fit_normalized.png`
- `spectral_waterfall.png`
- `spectral_heatmap.png`

对应路由入口：

- `render_fit_figures()`：`backend/app/main.py:685-737`
- `render_spectral_figure()`：`backend/app/main.py:740-746` 以及后续调用

---

## 1. 最核心的共享字体控制位置

### `_style_axes()`

位置：`backend/app/main.py:76-93`

这是 **四张图共用** 的坐标轴文字样式函数。

```python
def _style_axes(ax: Any, xlabel: str, ylabel: str) -> None:
    ax.set_xlabel(xlabel, fontsize=11, fontname="Arial")
    ax.set_ylabel(ylabel, fontsize=11, fontname="Arial")
    ax.tick_params(
        axis="both",
        direction="out",
        labelsize=10,
        width=0.8,
        length=4,
        top=False,
        right=False,
    )
    for label in ax.get_xticklabels() + ax.get_yticklabels():
        label.set_fontname("Arial")
```

### 这里控制什么

- `fontsize=11`
  - 控制 **X 轴标题** 大小
  - 控制 **Y 轴标题** 大小
- `fontname="Arial"`
  - 控制 **X / Y 轴标题字体**
- `labelsize=10`
  - 控制 **坐标轴刻度数字** 大小
- `label.set_fontname("Arial")`
  - 控制 **坐标轴刻度数字字体**

### 如果你想统一改四张图的字体

优先改这里：

- 改所有坐标轴标题大小 → 改 `fontsize=11`
- 改所有刻度数字大小 → 改 `labelsize=10`
- 改字体族 → 把 `Arial` 改成你想要的字体，例如 `Times New Roman`、`Calibri`、`DejaVu Sans`

---

## 2. Fit Overlay / Fit Normalized 的图例文字

### `_add_curve_labels()`

位置：`backend/app/main.py:143-161`

这个函数只影响：

- `fit_overlay.png`
- `fit_normalized.png`

```python
ax.legend(
    loc=default_loc,
    bbox_to_anchor=(base_x + dx, base_y - dy),
    frameon=False,
    fontsize=9,
    handlelength=1.5,
    labelspacing=0.3,
    borderaxespad=0.0,
    prop={"family": "Arial"},
)
```

### 这里控制什么

- `fontsize=9`
  - 控制 **图例文字大小**
- `prop={"family": "Arial"}`
  - 控制 **图例字体**
- `loc=...`
  - 控制图例默认位置
- `bbox_to_anchor=...`
  - 控制图例偏移

### 如果你想改 fit 图右上/右下角标签样式

改这里：

- 图例字号 → `fontsize=9`
- 图例字体 → `Arial`

### 哪张图用到它

- `fit_overlay.png` 在 `backend/app/main.py:191-192` 调用
- `fit_normalized.png` 在 `backend/app/main.py:233-234` 调用

---

## 3. 四张图逐张说明

---

### A. `fit_overlay.png`

生成函数位置：`backend/app/main.py:164-195`

#### 当前文字来源

```python
_style_axes(
    ax,
    str(figure_settings.get("xlabel") or "Time / Potential"),
    str(figure_settings.get("ylabel") or "Peak Area"),
)
```

#### 这张图能改的文字相关项

1. **X 轴标题内容**
   - 默认：`Time / Potential`
2. **Y 轴标题内容**
   - 默认：`Peak Area`
3. **X / Y 轴标题大小与字体**
   - 由 `_style_axes()` 控制
4. **坐标轴刻度数字大小与字体**
   - 由 `_style_axes()` 控制
5. **图例文字大小与字体**
   - 由 `_add_curve_labels()` 控制
6. **图例显示开关**
   - `show_labels`

#### 注意

这张图 **没有单独 title**，也没有 colorbar。

---

### B. `fit_normalized.png`

生成函数位置：`backend/app/main.py:198-237`

#### 当前文字来源

```python
_style_axes(
    ax,
    str(figure_settings.get("xlabel") or "Time / Potential"),
    str(figure_settings.get("ylabel") or "Normalized Peak Area"),
)
```

#### 这张图能改的文字相关项

1. **X 轴标题内容**
   - 默认：`Time / Potential`
2. **Y 轴标题内容**
   - 默认：`Normalized Peak Area`
3. **X / Y 轴标题大小与字体**
   - 由 `_style_axes()` 控制
4. **坐标轴刻度数字大小与字体**
   - 由 `_style_axes()` 控制
5. **图例文字大小与字体**
   - 由 `_add_curve_labels()` 控制
6. **图例显示开关**
   - `show_labels`

#### 注意

这张图也 **没有单独 title**，也没有 colorbar。

---

### C. `spectral_waterfall.png`

生成函数位置：`backend/app/main.py:240-274`

#### 当前文字来源

```python
_style_axes(
    ax,
    str(figure_settings.get("xlabel") or r"Wavenumber (cm$^{-1}$)"),
    str(figure_settings.get("ylabel") or "Intensity + Offset"),
)

title = str(figure_settings.get("title") or "").strip()
if title:
    ax.set_title(title, fontsize=11, fontname="Arial", pad=8)
```

#### 这张图能改的文字相关项

1. **图标题内容**
   - `title`
2. **图标题大小**
   - `ax.set_title(... fontsize=11, ...)`
3. **图标题字体**
   - `fontname="Arial"`
4. **图标题上下间距**
   - `pad=8`
5. **X 轴标题内容**
   - 默认：`Wavenumber (cm$^{-1}$)`
6. **Y 轴标题内容**
   - 默认：`Intensity + Offset`
7. **X / Y 轴标题大小与字体**
   - 由 `_style_axes()` 控制
8. **坐标轴刻度数字大小与字体**
   - 由 `_style_axes()` 控制

#### 注意

这张图 **没有 legend**，也没有 colorbar。

---

### D. `spectral_heatmap.png`

生成函数位置：`backend/app/main.py:277-344`

#### 当前文字来源

```python
_style_axes(
    ax,
    str(figure_settings.get("xlabel") or r"Wavenumber (cm$^{-1}$)"),
    "Time / Potential",
)
```

以及 colorbar 两端的文字：

```python
cbar.ax.text(
    -0.06,
    0.5,
    f"{vmin:.2g}",
    ...
    fontsize=10,
    fontname="Arial",
)

cbar.ax.text(
    1.06,
    0.5,
    f"{vmax:.2g}",
    ...
    fontsize=10,
    fontname="Arial",
)
```

#### 这张图能改的文字相关项

1. **X 轴标题内容**
   - 默认：`Wavenumber (cm$^{-1}$)`
2. **Y 轴标题内容**
   - 固定：`Time / Potential`
3. **X / Y 轴标题大小与字体**
   - 由 `_style_axes()` 控制
4. **坐标轴刻度数字大小与字体**
   - 由 `_style_axes()` 控制
5. **colorbar 左端最小值文字大小**
   - `fontsize=10`
6. **colorbar 左端最小值字体**
   - `fontname="Arial"`
7. **colorbar 右端最大值文字大小**
   - `fontsize=10`
8. **colorbar 右端最大值字体**
   - `fontname="Arial"`

#### 注意

这张图：

- 没有 title
- 没有 legend
- `cbar.ax.set_xticks([])` 把 colorbar 默认刻度关掉了
- 现在看到的 colorbar 数字是手动画上去的，不是 Matplotlib 自动刻度

---

## 4. 如果你想改字体族（比如不要 Arial）

目前代码里显式写死的字体族主要有这几处：

1. `backend/app/main.py:77-78`
   - `fontname="Arial"`
2. `backend/app/main.py:89`
   - `label.set_fontname("Arial")`
3. `backend/app/main.py:160`
   - `prop={"family": "Arial"}`
4. `backend/app/main.py:265`
   - `ax.set_title(... fontname="Arial")`
5. `backend/app/main.py:327-338`
   - heatmap colorbar 两端文字 `fontname="Arial"`

如果要全改，建议统一替换成同一个字体名。

例如：

- `Arial`
- `Times New Roman`
- `Calibri`
- `DejaVu Sans`

> 注意：如果系统里没有这个字体，Matplotlib 可能会 fallback 到别的字体。

---

## 5. 最常见的修改方案

### 方案 A：四张图的坐标轴标题都变大

改这里：

- `backend/app/main.py:77`
- `backend/app/main.py:78`

例如：

```python
ax.set_xlabel(xlabel, fontsize=14, fontname="Arial")
ax.set_ylabel(ylabel, fontsize=14, fontname="Arial")
```

### 方案 B：四张图的刻度数字都变大

改这里：

- `backend/app/main.py:79-87`

把：

```python
labelsize=10
```

改成例如：

```python
labelsize=12
```

### 方案 C：只让 fit 图的图例文字变大

改这里：

- `backend/app/main.py:156`

把：

```python
fontsize=9
```

改成例如：

```python
fontsize=11
```

### 方案 D：只让 spectral waterfall 的标题变大

改这里：

- `backend/app/main.py:265`

把：

```python
ax.set_title(title, fontsize=11, fontname="Arial", pad=8)
```

改成例如：

```python
ax.set_title(title, fontsize=14, fontname="Arial", pad=8)
```

### 方案 E：只让 heatmap 顶部 colorbar 两端数字变大

改这里：

- `backend/app/main.py:326`
- `backend/app/main.py:337`

把：

```python
fontsize=10
```

改成例如：

```python
fontsize=12
```

---

## 6. 哪些地方目前还不能在右侧界面里直接调

目前右侧/左侧现有 UI 主要能改的是：

- 轴标题内容
- 范围
- 是否显示 fit 图图例
- label offset
- 图片尺寸和 DPI（新加的全局参数）

但以下这些 **还没有做成 UI 控件**，只能改后端代码：

- 坐标轴标题字号
- 坐标轴刻度字号
- 图例字号
- 图例字体
- waterfall 标题字号
- heatmap colorbar 两端数字字号
- 全部字体族（Arial 等）

---

## 7. 最后总结：改字体该去哪里

### 想全局改四张图的轴标题/刻度

去：

- `backend/app/main.py` → `_style_axes()`

### 想改 fit overlay / fit normalized 的图例

去：

- `backend/app/main.py` → `_add_curve_labels()`

### 想改单独某张图的专属文字

- `fit_overlay.png` → `_save_fit_overlay_figure()`
- `fit_normalized.png` → `_save_fit_normalized_figure()`
- `spectral_waterfall.png` → `_save_spectral_figure()`
- `spectral_heatmap.png` → `_save_spectral_heatmap_figure()`

如果后面要把“字体大小 / 字体族”也做进 UI，最合理的做法是：

1. 前端增加全局字体参数
2. 通过 `figure_settings.global` 传到后端
3. 在 `_style_axes()`、`_add_curve_labels()`、`_save_spectral_figure()`、`_save_spectral_heatmap_figure()` 里统一读取
