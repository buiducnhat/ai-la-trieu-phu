/**
 * Danh mục âm thanh chương trình thật. Khóa -> tên tệp trên Ai là triệu phú Wiki
 * (https://ailatrieuphu.fandom.com/vi/wiki/Âm_thanh, mục "Danh sách âm thanh phiên bản
 * Ai là triệu phú"). `scripts/fetch-audio.ts` tải và đổi sang `public/audio/<khóa>.mp3`.
 *
 * Tệp âm thanh có bản quyền của chương trình nên không nằm trong repo (xem .gitignore);
 * thiếu tệp thì `sound.ts` dùng tiếng chiptune tổng hợp.
 * Module thuần dữ liệu: cả client lẫn script Bun đều import được.
 */
export const AUDIO_FILES = {
  // Lên ghế nóng (giới thiệu người chơi) và nhạc "Sẵn sàng".
  intro: "Len_ghe_nong.ogg",
  ready: "Q1-6-11_-_Let's_Play.ogg",
  // Nhạc nền câu hỏi.
  "bed-1-5": "1-5.ogg",
  "bed-6": "6.ogg",
  "bed-7": "7.ogg",
  "bed-8": "8.ogg",
  "bed-9": "9.ogg",
  "bed-10": "10.ogg",
  "bed-11": "11.ogg",
  "bed-12": "12.ogg",
  "bed-13": "13.ogg",
  "bed-14": "14.ogg",
  "bed-15": "15.ogg",
  // Câu trả lời cuối cùng (câu 6–15, dùng chung theo cặp n và n+5).
  "final-6-11": "C6,_11_cau_tra_loi_cuoi_cung.ogg",
  "final-7-12": "C7,_12_cau_tra_loi_cuoi_cung.ogg",
  "final-8-13": "C8,_13_cau_tra_loi_cuoi_cung.ogg",
  "final-9-14": "C9,_14_cau_tra_loi_cuoi_cung.ogg",
  "final-10-15": "C10,_15_cau_tra_loi_cuoi_cung.ogg",
  // Trả lời đúng.
  "right-1-4": "C1-4---Dung.ogg",
  "right-5": "C5---Dung.ogg",
  "right-6": "C6,_11_dung.ogg",
  "right-7": "C7,_12_dung.ogg",
  "right-8": "C8,_13_dung.ogg",
  "right-9": "C9,_14_dung.ogg",
  "right-10": "C10_dung.ogg",
  "right-11": "Q11-correct.ogg",
  "right-12": "Q12-correct.ogg",
  "right-13": "Q13-correct.ogg",
  "right-14": "Q14-correct.ogg",
  "right-15": "C15_dung.ogg",
  millionaire: "Millionaire.ogg",
  // Trả lời sai.
  "wrong-1-5": "C1-5_sai.ogg",
  "wrong-6-11": "C6,_11_sai.ogg",
  "wrong-7-12": "C7,_12_sai.ogg",
  "wrong-8-13": "C8,_13_sai.ogg",
  "wrong-9-14": "C9,_14_sai.ogg",
  "wrong-10": "C10_sai.ogg",
  "wrong-15": "C15_sai.ogg",
  // Quyền trợ giúp.
  "life-5050": "5050.ogg",
  "life-ready": "Phone_a_Friend_Ready.ogg",
  "life-phone": "Phone_a_Friend_Clock.ogg",
  "life-wise": "3_Wise_Men.ogg",
  "life-plus-one": "Plus_One_Vietnam.ogg",
  "life-end": "Phone-a-Friend_End.ogg",
  // Kết thúc lượt chơi (dừng cuộc chơi).
  "turn-over": "Het_luot_choi.ogg",
} as const;

export type AudioKey = keyof typeof AUDIO_FILES;

/**
 * Tệp wiki dài hơn đoạn cần dùng (nhạc "Sẵn sàng" kéo dài vài phút): cắt còn N giây, mờ dần 1,5 giây cuối.
 */
export const AUDIO_TRIM_SECONDS: Partial<Record<AudioKey, number>> = {
  ready: 8,
  "life-ready": 6,
};
