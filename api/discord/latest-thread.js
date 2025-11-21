// api/discord/latest-thread.js – за /tema команда
import { initializeApp } from "firebase/app";
import { getFirestore, collection, orderBy, limit, getDocs } from "firebase/firestore";

const firebaseConfig = { /* истиот config од погоре */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  try {
    const snapshot = await getDocs(
      collection(db, "threads")
        .orderBy("createdAt", "desc")
        .limit(1)
    );

    if (snapshot.empty) {
      return res.status(200).json({ title: "Нема теми", id: null });
    }

    const thread = snapshot.docs[0];
    const data = thread.data();

    res.status(200).json({
      title: data.title || "Без наслов",
      id: thread.id,
      author: data.author || "Непознат"
    });
  } catch (error) {
    res.status(500).json({ title: "Грешка", id: null });
  }
}
