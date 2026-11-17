# 🐉 Đảo Rồng Nhỏ

Game nuôi rồng trên đảo, đồ hoạ 3D, chạy thẳng trên trình duyệt (máy tính và điện thoại). Viết bằng JavaScript thuần và [three.js](https://threejs.org), không cần build.

> Đây là game nguyên bản thuộc thể loại "nuôi rồng trên đảo". Toàn bộ tên gọi, loài rồng, mô hình 3D và giao diện đều được tạo mới, không dùng tài nguyên hay thương hiệu của game nào khác.

## Chạy game

```bash
npm start
```

Mở `http://localhost:8080`. Không cần `npm install`: three.js đã nằm sẵn trong thư mục `vendor/`.

Thư mục này là trang tĩnh nên có thể đưa thẳng lên GitHub Pages, Netlify hoặc bất kỳ máy chủ web nào. Mở trực tiếp file `index.html` (`file://`) thì **không** chạy được, vì trình duyệt chặn ES module.

## Tính năng

| Tính năng | Mô tả |
|---|---|
| 🏝️ Đảo 3D | Xoay, kéo, phóng to; rồng đi dạo quanh khu ở; mây, sóng nước, bóng đổ |
| 🏠 Khu ở 8 hệ | Lửa, Mộc, Nước, Đất, Lôi, Băng, Quang, Ám. Mỗi khu có mô hình riêng, tự sinh vàng, nâng được 3 cấp |
| 🥚 Trứng & Lò ấp | Mua trứng, ấp theo thời gian, nâng cấp lò để ấp nhiều trứng cùng lúc, có túi chứa trứng |
| 🐉 33 loài rồng | Thường, Hiếm, Quý, Huyền thoại, Sự kiện. Rồng lớn qua 3 giai đoạn (con → thiếu niên → trưởng thành) |
| 🌾 Vườn thức ăn | 4 loại cây; thức ăn dùng để cho rồng ăn và lên cấp (tối đa cấp 20) |
| 💕 Lai giống | Ghép 2 rồng từ cấp 4 trở lên, hiện tỉ lệ ra từng loài; loài lai chỉ có được qua lai giống |
| ⚔️ Đấu trường 3D | Chọn đội 3 rồng, trận theo lượt có hiệu ứng, tương khắc hệ, chí mạng, trùm mỗi 5 ải |
| 📖 Sách rồng | Bộ sưu tập, hình bóng của loài chưa có, bảng tương khắc |
| 📜 Nhiệm vụ | Chuỗi nhiệm vụ chính, 3 nhiệm vụ ngày + thưởng hoàn thành, điểm danh 7 ngày |
| 🌳 Trang trí & mở đảo | 12 vật trang trí, di chuyển/bán công trình, mở rộng đảo 4 lần |
| 🎉 Sự kiện | Theo lịch, có ưu đãi, điểm sự kiện, mốc thưởng, cửa hàng đổi điểm, rồng sự kiện; thời tiết thay đổi theo chủ đề |
| 💾 Lưu game | Tự lưu trong trình duyệt, tiền vẫn sinh khi offline, có sao lưu/khôi phục bằng văn bản |

## Thiết lập sự kiện

Vào **Sự kiện → ⚙️ Thiết lập sự kiện** (hoặc **Cài đặt → Thiết lập sự kiện**).

- **Tạo từ mẫu**: có 5 mẫu: Khai Đảo, Trăng Rằm, Hội Xuân, Bí Ngô, Đông Ấm. Sự kiện mới tự xếp lịch sau sự kiện cuối cùng.
- **Sửa** từng sự kiện:
  - tên, mô tả, chủ đề (đổi thời tiết và màu trời: nắng lấp lánh, đom đóm, hoa đào rơi, bào tử tím, tuyết)
  - tên và biểu tượng của điểm sự kiện
  - thời gian bắt đầu và kết thúc
  - hệ số ưu đãi: vàng, thức ăn, kinh nghiệm, tốc độ ấp, tốc độ lai
  - số điểm nhận được cho mỗi hành động: thu vàng, cho ăn, thu hoạch, ấp, lai, thắng trận
  - mốc thưởng và cửa hàng đổi điểm (vàng, thức ăn, đá quý, kinh nghiệm, trứng rồng bất kỳ, đồ trang trí), có giới hạn lượt đổi
- **Bắt đầu ngay / Kết thúc** để thử nghiệm. Nếu nhiều sự kiện trùng lịch, sự kiện bắt đầu gần nhất được ưu tiên.
- **Xuất / Nhập JSON** để sao lưu hoặc chia sẻ cấu hình sự kiện.

Trong **Cài đặt** còn có *Công cụ thử nghiệm*: cộng tài nguyên, tua nhanh thời gian, đặt cấp.

## Cấu trúc mã

```
index.html, style.css     giao diện & HUD
src/data.js               dữ liệu: hệ, loài rồng, công trình, cây, nhiệm vụ
src/state.js              trạng thái, lưu/tải, bus sự kiện
src/game.js               luật chơi (kinh tế, ấp, lai, nhiệm vụ…)
src/events.js             hệ thống sự kiện & mẫu sự kiện
src/dragon3d.js           mô hình rồng/trứng dựng bằng code + ảnh chân dung
src/models.js             mô hình công trình
src/world.js              cảnh 3D, camera, đặt công trình, thời tiết
src/battle.js             đấu trường 3D
src/ui.js                 các bảng chức năng
src/sound.js              âm thanh tổng hợp (WebAudio)
vendor/                   three.js r170 (giấy phép MIT)
```

Muốn thêm loài rồng mới: thêm một dòng vào `DRAGONS` trong `src/data.js`. Phần `look` (màu sắc, kiểu sừng/cánh/đuôi) đủ để game tự dựng mô hình 3D.
