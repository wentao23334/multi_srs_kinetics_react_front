import numpy as np
from .common import find_all


def extract_time_axis(srs: bytes, frame_marker: bytes, mode: str = "fast"):
    positions = find_all(srs, frame_marker)
    if len(positions) < 2:
        print("未找到足够帧标志，无法提取时间轴")
        return None, positions

    time_vals = []
    for pos in positions:
        ascii_part = srs[pos + 8: pos + 16]
        val_str = ascii_part.decode(errors="ignore").strip()
        try:
            val = float(val_str)
        except ValueError:
            val = np.nan
        time_vals.append(val)

    time_vals = np.asarray(time_vals, dtype=float)
    finite = np.isfinite(time_vals)
    if not finite.any():
        print("未解析出有效时间值")
        return None, positions

    # ✅ 新增：自动检测伪帧 #0
    if mode == "fast" and len(positions) > 1:
        first_gap = positions[1] - positions[0]
        if first_gap > 20000:  # 典型伪帧差距 40478 B
            print(f"[INFO] 检测到首帧异常（伪帧 #0），间距 = {first_gap} bytes，自动跳过。")
            positions = positions[1:]
            time_vals = time_vals[1:] if len(time_vals) > len(positions) else time_vals
            # 🔧 同步修复布尔掩码长度
            finite = np.isfinite(time_vals)

    # ✅ 输出信息时使用最新掩码
    valid_vals = time_vals[finite]
    print(f"[OK] 解析时间/电位 {len(valid_vals)} 点，范围: {valid_vals[0]:.4f} ~ {valid_vals[-1]:.4f}")
    return time_vals, positions
