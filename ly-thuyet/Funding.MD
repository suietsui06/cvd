# FUNDING RATE - [SPOT]+[FUTURES]

*( Với trường hợp của futures thì BUY = LONG = phe MUA và SELL = SHORT = phe BÁN. Được định nghĩa giống nhau )*

## ĐỊNH NGHĨA CƠ BẢN

**Funding Rate** là chỉ số đo lường sự chênh lệch giữa giá tài sản trên thị trường Futures vĩnh cửu (Perpetual) và thị trường Spot (giao ngay). Đây là cơ chế để buộc giá Futures quay về gần với giá Spot thông qua việc trao đổi tiền định kỳ giữa phe LONG và SHORT.

* **delta\_FR > 0 (dương)** => phe LONG kiểm soát thị trường (Futures cao hơn Spot) → LONG phải trả tiền cho SHORT
* **delta\_FR < 0 (âm)** => phe SHORT kiểm soát thị trường (Futures thấp hơn Spot) → SHORT phải trả tiền cho LONG

## THÀNH PHẦN FUNDING RATE

### 1. **Chênh Lệch Giá (Premium/Discount)**

* Premium > 0: Giá Futures > Giá Spot (Thị trường quá mua, LONG nóng)
* Premium < 0: Giá Futures < Giá Spot (Thị trường quá bán, SHORT nóng)

### 2. **Tâm Lý Thị Trường (Market Sentiment)**

* Bullish (Tăng): Funding Rate dương cao → LONG kiểm soát
* Bearish (Giảm): Funding Rate âm → SHORT kiểm soát
* Neutral: Funding Rate gần 0 → Cân bằng

### 3. **Tần Suất Cập Nhật**

* Binance: 8 giờ một lần (07:00, 15:00, 23:00 giờ VN)
* Mỗi lần = 0.01% cơ bản (mỗi ngày = 0.03%)

## CÔNG THỨC TÍNH FUNDING FEE

**Funding Fee = Giá Trị Vị Thế × Funding Rate**

*Giá Trị Vị Thế = Số Lượng Nắm Giữ × Giá Tài Sản*

**Ví dụ:**

* Vị thế: 10 BTC, giá hiện tại 40.000 USDT
* Giá trị vị thế = 10 × 40.000 = 400.000 USDT
* Funding Rate = 0.01% (mỗi 8 giờ)
* Funding Fee = 400.000 × 0.01% = 40 USDT/lần
* 1 ngày (3 lần): 40 × 3 = 120 USDT
* 1 năm: 120 × 365 = 43.800 USDT (nếu không đổi)

## CÁCH DÙNG FUNDING RATE

### 1. **Bullish Divergence (Tích Cực):**

* **GIÁ [Lower Low]** giá tạo đáy thấp hơn + **FR [Âm/Thấp hơn]** Funding Rate giảm hoặc chuyển âm
* → Tín hiệu: SHORT yếu dần, chuẩn bị bật tăng
* → Hành động: LONG tại support với xác suất cao

### 2. **Bearish Divergence (Tiêu Cực):**

* **GIÁ [Higher High]** giá tạo đỉnh cao hơn + **FR [Dương/Cao hơn]** Funding Rate tăng cao
* → Tín hiệu: LONG quá nóng, chuẩn bị điều chỉnh
* → Hành động: SHORT tại resistance hoặc tránh LONG

### 3. **Xu Hướng TĂNG Bền Vững:**

* GIÁ + FR cùng tăng (Giá tăng + Funding Rate dương tăng)
* → LONG kiểm soát, xu hướng mạnh
* → Hành động: Tiếp tục LONG, pyramid thêm tại support

### 4. **Xu Hướng GIẢM Bền Vững:**

* GIÁ + FR cùng giảm (Giá giảm + Funding Rate âm hoặc dương giảm)
* → SHORT kiểm soát, xu hướng mạnh
* → Hành động: Tiếp tục SHORT

### 5. **Xu Hướng Yếu:**

* GIÁ không đồng bộ với FR (Giá tăng nhưng FR âm, hoặc giá giảm nhưng FR dương tăng)
* → Tâm lý thị trường không khớp với chuyển động giá
* → Hành động: Thận trọng, giảm size, chờ xác nhận rõ ràng

### 6. **Sideway + FR Tăng Mạnh:**

* CVD/Giá sideway (chốp lên xuống) + Funding Rate dương tăng đột biến
* → Chuẩn bị breakout tăng (Bullish)
* → Hành động: Chuẩn bị LONG tại kháng cự

### 7. **Sideway + FR Giảm Mạnh:**

* CVD/Giá sideway + Funding Rate âm hoặc giảm mạnh
* → Chuẩn bị breakdown giảm (Bearish)
* → Hành động: Chuẩn bị SHORT tại hỗ trợ

## SỰ QUYẾT ĐỊNH

### VÀO LỆNH

**LONG:**

* Khi FR phân kỳ Bullish (Funding Rate chuyển âm hoặc giảm while Price Lower Low)
* Tìm ENTRY tại vùng hỗ trợ (Support)
* Hoặc tại Break of Structure (BO)
* Hoặc khi nhận thấy nến xác nhận: Bullish Engulfing/Pin Bar tại support

**SHORT:**

* Khi FR phân kỳ Bearish (Funding Rate tăng dương cao while Price Higher High)
* Tìm ENTRY tại vùng kháng cự (Resistance)
* Hoặc khi giá cố gắng vượt kháng cự nhưng FR quá cao
* Hành động: Short để arbitrage funding fee

### HOLD?

**OK (Tiếp tục giữ):**

* Khi FR vẫn tiếp tục xu hướng tăng/giảm cùng hướng với đường giá
* Khi FR còn mạnh (dương cao cho LONG, âm cho SHORT)
* Move SL lên để bảo vệ lợi nhuận

**Cân Nhắc Đóng Lệnh:**

* Khi FR yếu dần (từ +0.05% xuống 0.01%)
* Khi FR phân kỳ với hướng giá
* Khi FR đảo chiều (từ dương sang âm, hoặc ngược lại)

### EXIT!!

**Ngay Lập Tức:**

* Khi FR đảo chiều mạnh (từ +0.08% xuống -0.01% trong 1 lần tính)
* Khi FR chuyển từ hỗ trợ sang cảnh báo
* Khi theo dõi cảnh báo dạng "Liquidation Cascade" (FR đột ngột tăng vọt)

**Cắt Lỗ:**

* Khi FR chậm dần (từ +0.05% xuống +0.01%) = sức mua đang yếu đi
* Khi FR không confirm entry point

### DCA (Đạo Thêm Vị Thế)

* **Tăng thêm LONG** khi: Giá xuống support mới + FR vẫn dương (still bullish)
* **Tăng thêm SHORT** khi: Giá lên resistance + FR đột ngột tăng rất cao (warning sign)
* **KHÔNG DCA** khi: FR quá cao (>0.1%) hoặc đảo chiều

### TIMEFRAME

**Scalping:**

* Khi FR biến động mạnh, rõ ràng, hay change sign
* FR cung cấp signal nhanh, thích hợp giao dịch ngắn hạn (5-15p)

**Day Trading:**

* FR tốt nhất ở timeframe 1H-4H
* FR ổn định giúp capture trend hàng ngày

**Swing:**

* FR có xu hướng rõ ràng (3-5 ngày)
* Thích hợp hold vị thế dài hạn khi FR hỗ trợ

### KHÔNG TRADE

* **FR choppy (loạn xạ):** FR liên tục đổi dấu hoặc rung lắc 0 → Không có tín hiệu rõ ràng
* **VOL giao dịch quá thấp:** Thị trường ít thanh khoản → FR chuẩn không đáng tin
* **Trước tin (Before News):** FR có thể thay đổi bất thường khi có tin lớn
* **Market Extreme:** FR > 0.5% hoặc < -0.5% = Thị trường ở cực kỳ, rủi ro thanh lý cao

---

## TÓM TẮT 7 QUYẾT ĐỊNH TỪ FUNDING RATE


| Quyết Định       | Tín Hiệu FR                                                      | Hành Động                                     |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| **1. Entry Long**   | FR phân kỳ bullish (âm/thấp), giá tại support, nến confirm  | Chuẩn bị mua khi BOS hoặc support confirm     |
| **2. Entry Short**  | FR phân kỳ bearish (dương cao), giá tại resistance           | Chuẩn bị bán khi BO kháng cự hoặc FR spike |
| **3. Hold**         | FR còn mạnh cùng hướng (dương cho LONG, âm/yếu cho SHORT) | Giữ lệnh, move SL, pyramid nếu có setup      |
| **4. Exit**         | FR đảo chiều mạnh, FR yếu dần, divergence                    | Đóng toàn bộ hoặc scale out từng phần     |
| **5. Add Position** | FR confirm sau entry, giá quay lại support với FR hỗ trợ      | Pyramid thêm, tăng size vị thế               |
| **6. Reduce Risk**  | FR choppy, quá cao (>0.1%), khó dự đoán                       | Giảm size, tighter SL, chờ rõ ràng hơn      |
| **7. Stay Out**     | FR loạn xạ, không rõ hướng, vol thấp                        | NGỒI NGOÀI, chờ FR ổn định trở lại       |

---

## CẢNH BÁO - FUNDING RATE EXTREME

### FR QUỐC CAO (>0.08%):

* ✗ Cảnh báo: LONG quá đông, thị trường nóng
* ✗ Rủi ro: Liquidation cascade (thanh lý hàng loạt)
* ✓ Cơ hội: SHORT để arbitrage funding fee

### FR ÂM MẠNH (<-0.05%):

* ✗ Cảnh báo: SHORT quá đông
* ✓ Cơ hội: LONG tại support vì FR sắp quay dương

### FR = 0 (Neutral):

* = Thị trường cân bằng
* ≈ Có thể đi theo hướng nào cũng được
* → Phụ thuộc vào Price Action và tin tức

---

## KẾT HỢP FUNDING RATE + PRICE ACTION

### Setup Tối Ưu:

**LONG Setup:**

* Price tại support + Price Action confirm (Bullish Engulfing/Pin Bar)
* * FR đảo từ âm sang dương (hoặc âm/yếu)
* * CVD phân kỳ bullish
* = Xác suất LONG cao

**SHORT Setup:**

* Price tại resistance + Price Action confirm (Bearish Engulfing/Pin Bar)
* * FR tăng cao (>0.03%)
* * CVD phân kỳ bearish
* = Xác suất SHORT cao

### Cảnh Báo Kết Hợp:

* Giá tăng + FR dương cao + CVD mạnh = Trend mạnh, LONG an toàn
* Giá tăng + FR dương CAO QUÁ (>0.1%) + CVD có dấu hiệu yếu = CẢNH BÁO, tránh LONG mới
* Giá giảm + FR âm + CVD mạnh = Trend mạnh, SHORT an toàn
* Giá sideway + FR tăng đột ngột = Chuẩn bị breakout tăng
* Giá sideway + FR giảm đột ngột = Chuẩn bị breakdown giảm

---

## LƯỚI QUYẾT ĐỊNH HÀNG NGÀY

### Sáng (Trước 08:00 VN):

* Kiểm tra FR từ hôm trước
* Xác định hướng chính (Bullish/Bearish/Neutral)
* Dự tính FR lần tính 15:00

### Tiếp theo (08:00-14:59 VN):

* Giao dịch theo setup của sáng
* Theo dõi FR thay đổi
* Chuẩn bị cho lần tính 15:00

### Buổi chiều (15:00-22:59 VN):

* FR tính lại lúc 15:00 - kiểm tra signal
* Giao dịch theo xu hướng của chiều
* Chuẩn bị cho lần tính 23:00

### Tối (23:00 trở đi):

* FR tính lại lúc 23:00 - điểm quyết định
* Nếu FR đảo chiều → Đặc biệt chú ý setup của hôm sau
* Quản lý vị thế qua đêm dựa trên FR dự kiến

---

## SUMMARY - FUNDING RATE LÀ GỊ?

**Funding Rate = Chỉ số Tâm Lý Thị Trường**

* **Cao (dương):** LONG kiểm soát, thị trường tăng mạnh nhưng có cảnh báo nếu quá cao
* **Thấp/Âm:** SHORT kiểm soát hoặc cân bằng, cơ hội LONG
* **Swing:** Thị trường không rõ ràng, chờ xác nhận rõ từ Price Action

**Cách dùng:**

1. Xác định hướng từ FR (bullish/bearish/neutral)
2. Tìm entry point từ Price Action
3. Quản lý vị thế dựa trên FR change
4. Exit khi FR đảo chiều hoặc yếu dần

**Mô hạng từ:**

* FR = Thành phố (hướng chính)
* Price Action = Con đường cụ thể (entry/exit)
* CVD = Xác nhận bước chân (lực mua/bán)

**Không bao giờ:**

* Giao dịch khi FR choppy/loạn
* LONG khi FR quá cao (>0.1%)
* Chỉ tin FR, phải kết hợp Price Action
* Bỏ qua cảnh báo liquidation từ FR extreme
