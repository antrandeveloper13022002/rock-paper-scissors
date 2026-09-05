# Thiết kế: Web Game Thẻ Bài Oẳn Tù Tì

## 1. Tổng quan

Web game thẻ bài 1v1 dựa trên Kéo-Búa-Bao, chơi với NPC. Mỗi người chơi có 1 nhân vật (1 skill cố định) và 1 deck 7 lá tự build (Kéo/Búa/Bao theo tỉ lệ tự chọn). Trận đấu diễn ra tối đa 7 turn, mỗi turn 20 giây, ai đạt 5 điểm trước thắng ngay; nếu hết 7 turn mà chưa ai đủ 5 điểm thì so điểm, bằng nhau là hòa.

## 2. Kiến trúc kỹ thuật

- **Stack**: React + Vite, JavaScript thuần, state qua React Context + `useReducer`.
- **3 lớp tách biệt** (để mở đường cho chế độ online sau này mà không viết lại luật chơi):
  - **Engine (pure logic)**: module JS không phụ thuộc React/DOM. Nhận `state` + `action` (`SELECT_CARD`, `USE_SKILL`, `READY`, `TIMEOUT`...), trả `state` mới. Chứa toàn bộ luật: quản lý hand/deck, 2 pha của turn, resolve skill, tính điểm, điều kiện thắng. Vì là reducer thuần, có thể chạy y nguyên trên server Node.js làm trọng tài authoritative cho PvP thật sau này.
  - **Local adapter**: giả lập đối thủ bằng NPC AI chạy trên client, gọi vào engine giống hệt một người chơi thật (không có đường tắt/thông tin đặc quyền).
  - **UI (React)**: chỉ đọc state, dispatch action; không chứa luật chơi.
- Khi làm online sau này: thay Local adapter bằng Network adapter (WebSocket), giữ nguyên engine và UI.

## 3. Data model

```
Card         { id, type: 'keo' | 'bua' | 'bao' }
Character    { id, name, avatar, skillId }   // 1 nhân vật = 1 skill cố định
Deck         Card[7]                          // tự do phối loại, kể cả 7 lá cùng loại
PlayerState  {
  character, deck, hand (<=3 lá), discardPile/deckRemaining,
  score, skillUsed: boolean, pendingSkillEffect
}
MatchState   { players: [PlayerState, PlayerState], turn, phase, timer, roundLog, result }
```

## 4. Luồng chính

Menu chính → Chọn nhân vật (skill cố định theo nhân vật) → Build deck 7 lá (tự do) → Vào trận: xem được thành phần deck đối thủ (số lượng kéo/búa/bao), không thấy skill đối thủ → mỗi bên rút 3 lá ngẫu nhiên → vòng lặp turn → kết quả trận (thắng/thua/hòa).

NPC: thành phần deck ngẫu nhiên, có 1 skill ngẫu nhiên (ẩn với người chơi giống như luật chung).

## 5. Cấu trúc 1 turn (20 giây, 2 pha)

1. **Skill-phase**: cả 2 bên đồng thời quyết định dùng skill hay không (mỗi người chỉ dùng skill được đúng 1 lần/trận).
   - Skill tức thời, resolve ngay trong pha này:
     - `#4 Ép đổi lá`: hệ thống chọn ngẫu nhiên 1 lá trên tay đối thủ, trả lá đó về deck, đối thủ rút 1 lá mới thay thế từ deck còn lại. Đối thủ không được báo trước lá nào sẽ bị đổi.
     - `#5 Xem trộm`: người dùng skill được xem 2 lá ngẫu nhiên trong tay hiện tại của đối thủ (dùng để tham khảo ở choose-phase).
   - Skill hoãn, chỉ "đăng ký" ở pha này, resolve ở bước sau:
     - `#1 Đổi bài`, `#2 x2 điểm khi thắng`, `#3 Chặn điểm đối thủ khi mình thua`.
2. **Choose-phase**: cả 2 bên đồng thời chọn 1 lá trong tay + bấm Sẵn sàng. Hết 20 giây mà chưa thao tác xong: tự động chọn ngẫu nhiên 1 lá còn lại trong tay, coi như không dùng skill (nếu chưa quyết định ở skill-phase).
3. **Swap resolve**: nếu có người dùng skill `#1` ở bước 1, hoán đổi 2 lá vừa chọn của 2 bên tại đây (trước khi lật bài) — kết quả turn coi như bị đảo ngược hoàn toàn.
4. **Reveal**: lật bài, xác định thắng/thua/hòa theo luật kéo-búa-bao chuẩn.
5. **Scoring resolve**:
   - Hòa: không bên nào được điểm.
   - Thắng thường: +1 điểm.
   - Người thắng có dùng skill `#2`: +2 điểm thay vì +1.
   - Người **thua** có dùng skill `#3`: người thắng không được cộng điểm ván này (dù thắng).
6. **Kiểm tra thắng ngay**: ngay sau khi cộng điểm, nếu có bên đạt ≥5 điểm → kết thúc trận ngay lập tức, bên đó thắng toàn ván (không chơi tiếp các turn còn lại).
7. Nếu chưa ai đạt 5 và còn lá trong deck: rút thêm 1 lá ngẫu nhiên vào tay, sang turn tiếp theo.
8. Sau khi chơi hết 7 lá (7 turn) mà chưa ai đạt 5 điểm: so điểm — ai cao hơn thắng; bằng điểm nhau → hòa ván.

## 6. Deck building

Không giới hạn tỉ lệ — người chơi có thể chọn bất kỳ tổ hợp Kéo/Búa/Bao nào miễn tổng = 7 lá (kể cả 7 lá cùng 1 loại), đánh đổi giữa độ đa dạng và tính dự đoán được.

## 7. NPC AI

- Thành phần deck: ngẫu nhiên khi tạo trận.
- Chọn lá mỗi turn: ngẫu nhiên có trọng số đơn giản theo tình huống (ví dụ: nếu NPC đang biết trước 1 phần bài đối thủ nhờ skill `#5`, ưu tiên chọn lá khắc chế).
- Dùng skill: đúng 1 lần/trận, kích hoạt ngẫu nhiên nhưng thiên về thời điểm hợp lý đơn giản (ví dụ khi đang thua điểm hoặc tỉ số sát nút).

## 8. Visual style

Hướng **Neon Arcade**: nền tối (tím than → đen), viền/chữ phát sáng neon tím-hồng, thẻ bài bo góc với icon lớn ở giữa. Màn hình trận đấu: thanh thông tin đối thủ (tên + thành phần deck đã biết + số lá còn lại) trên cùng, thanh điểm số, tag pha hiện tại + đồng hồ đếm ngược ở giữa trên, 2 ô đối đầu (arena) ở giữa, tay bài + nút "Dùng Skill" + nút "Sẵn sàng" ở dưới cùng. (Đã duyệt qua mockup.)

## 9. Cấu trúc thư mục

```
src/
  engine/        # pure logic: reducer, luật thắng thua, skill resolvers — không import React
  ai/            # NPC decision logic, gọi engine như 1 người chơi thật
  components/    # MainMenu, CharacterSelect, DeckBuilder, MatchScreen, Card, Timer...
  data/          # danh sách character + skill definitions, card type definitions
  styles/        # theme Neon Arcade
```

## 10. Ngoài phạm vi bản đầu (out of scope, để sau)

- Chế độ online/PvP thật (kiến trúc đã chừa chỗ nhưng chưa implement network adapter).
- Tài khoản người dùng / lưu trữ server-side.
- AI đối thủ chiến thuật nâng cao (chỉ làm bản weighted-random đơn giản trước).
