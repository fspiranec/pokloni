
import React, { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  getDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [newItem, setNewItem] = useState({ name: "", details: "", max: 0 });
  const [editingItem, setEditingItem] = useState(null);
  const [rsvpDone, setRsvpDone] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [eventDetails, setEventDetails] = useState("");
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editText, setEditText] = useState("");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesRef = useRef(null);

  const logout = () => setCurrentUser(null);

  const login = async (e) => {
    e.preventDefault();
    const { username, password } = e.target;
    const userRef = doc(db, "users", username.value);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().password === password.value) {
      setCurrentUser({
        username: username.value,
        role: userSnap.data().role,
        coming: userSnap.data().coming || false,
      });
      setRsvpDone(!!userSnap.data().coming);
      setDeclined(false);
    } else {
      alert("Invalid credentials");
    }
  };

  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, "items"), (snapshot) => {
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(
        snapshot.docs.map((doc) => ({ username: doc.id, ...doc.data() }))
      );
    });
    const unsubInfo = onSnapshot(doc(db, "config", "event"), (snap) => {
      if (snap.exists()) setEventDetails(snap.data().details || "");
    });
    const unsubMessages = onSnapshot(
      query(collection(db, "messages"), orderBy("timestamp", "asc")),
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubItems();
      unsubUsers();
      unsubInfo();

      unsubMessages();

    };
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const createUser = async () => {
    if (!newUser.username || !newUser.password) return;
    await setDoc(doc(db, "users", newUser.username), {
      password: newUser.password,
      role: "user",
      coming: false,
    });
    setNewUser({ username: "", password: "" });
  };

  const deleteUser = async (username) => {
    if (window.confirm("Delete this user?")) {
      await deleteDoc(doc(db, "users", username));
    }
  };

  const createItem = async () => {
    if (!newItem.name) return;
    await setDoc(doc(collection(db, "items")), {
      name: newItem.name,
      details: newItem.details,
      max: Number(newItem.max) || 0,
      claimedBy: [],
    });
    setNewItem({ name: "", details: "", max: 0 });
  };

  const claimItem = async (item, user) => {
    if (
      (item.max > 0 && item.claimedBy.length >= item.max) ||
      item.claimedBy.includes(user)
    ) {
      return;
    }
    await updateDoc(doc(db, "items", item.id), {
      claimedBy: arrayUnion(user),
    });
  };

  const returnItem = async (item, user) => {
    await updateDoc(doc(db, "items", item.id), {
      claimedBy: arrayRemove(user),
    });
  };

  const deleteItem = async (id) => {
    if (window.confirm("Delete this item?")) {
      await deleteDoc(doc(db, "items", id));
    }
  };

  const startEdit = (item) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      details: item.details,
      max: item.max || 0,
    });
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    await updateDoc(doc(db, "items", editingItem.id), {
      name: editingItem.name,
      details: editingItem.details,
      max: Number(editingItem.max) || 0,
    });
    setEditingItem(null);
  };

  const cancelEdit = () => setEditingItem(null);

  const openEditDetails = () => {
    setEditText(eventDetails);
    setEditDetailsOpen(true);
  };

  const saveDetails = async () => {
    await setDoc(doc(db, "config", "event"), { details: editText });
    setEditDetailsOpen(false);
  };

  const confirmArrival = async () => {
    await updateDoc(doc(db, "users", currentUser.username), { coming: true });
    setCurrentUser({ ...currentUser, coming: true });
    setRsvpDone(true);
  };

  const declineArrival = async () => {
    await updateDoc(doc(db, "users", currentUser.username), { coming: false });
    setCurrentUser(null);
    setDeclined(true);
  };

  const cancelArrival = async () => {
    const claimed = items.filter((i) =>
      i.claimedBy.includes(currentUser.username)
    );
    if (claimed.length) {
      await Promise.all(
        claimed.map((i) =>
          updateDoc(doc(db, "items", i.id), {
            claimedBy: arrayRemove(currentUser.username),
          })
        )
      );
    }
    await updateDoc(doc(db, "users", currentUser.username), { coming: false });
    setCurrentUser({ ...currentUser, coming: false });
    setRsvpDone(false);
  };


  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await addDoc(collection(db, "messages"), {
      user: currentUser.username,
      text: newMessage,
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
  };

  const deleteMessage = async (id) => {
    if (window.confirm("Delete this message?")) {
      await deleteDoc(doc(db, "messages", id));
    }
  };


  if (!currentUser) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        {declined && (
          <p className="text-red-600 mb-2">If you change your mind come again.</p>
        )}
        <form onSubmit={login} className="space-y-4">
          <input name="username" placeholder="Username" className="border p-2 w-full" />
          <input type="password" name="password" placeholder="Password" className="border p-2 w-full" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
        </form>
      </div>
    );
  }

  if (!rsvpDone) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        {eventDetails && <p>{eventDetails}</p>}
        <p className="font-semibold">Are you coming?</p>
        <div className="flex gap-2">
          <button
            onClick={confirmArrival}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Yes
          </button>
          <button
            onClick={declineArrival}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            No
          </button>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold">Confirmed Guests</h3>
          <ul className="list-disc list-inside">
            {users

              .filter((u) => u.coming && u.username !== "admin")
              .map((u, i) => (
                <li key={u.username}>{i + 1}. {u.username}</li>



              ))}
          </ul>
        </div>
      </div>
    );
  }



  const isAdmin = currentUser.role === "admin";


  return (
    <div className="p-6 max-w-4xl mx-auto">
      {editDetailsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded space-y-2 w-80">
            <textarea
              className="border p-2 w-full h-32"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={saveDetails}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Save
              </button>
              <button onClick={() => setEditDetailsOpen(false)} className="px-3 py-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Welcome, {currentUser.username}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={openEditDetails}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Edit Details
            </button>
          )}
          {currentUser.coming && (
            <button
              onClick={cancelArrival}
              className="bg-yellow-500 text-white px-4 py-2 rounded"
            >
              Cancel Arrival
            </button>
          )}
          <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded">
            Logout
          </button>
        </div>
      </div>
      {eventDetails && (
        <div className="mb-4">
          {eventDetails}
        </div>
      )}
      <div className="grid grid-cols-4 gap-6">
        <div>
          <h2 className="font-semibold">Confirmed Guests</h2>
          <ul className="mt-2 list-disc list-inside">
            {users

              .filter((u) => u.coming && u.username !== "admin")
              .map((u, i) => {
                const claimed = items
                  .filter((it) => it.claimedBy.includes(u.username))
                  .map((it) => it.name);
                return (
                  <li key={u.username}>
                    {i + 1}. {u.username}
                    {claimed.length > 0 && (
                      <span className="ml-1 text-sm text-gray-600">
                        ({claimed.join(", ")})
                      </span>
                    )}
                  </li>
                );
              })}



          </ul>
        </div>
        <div className="col-span-3 space-y-6">
          {isAdmin && (
            <>
              <div>
                <h2 className="font-semibold">Create User</h2>
                <div className="flex gap-2 mt-2">
                  <input
                    placeholder="Username"
                    value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="border p-2"
              />
              <input
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="border p-2"
              />
                <button onClick={createUser} className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
              </div>
              <ul className="mt-2">
                {users.map((u) =>

              


                  u.role !== "admin" ? (





                    <li key={u.username} className="flex justify-between mt-1">
                      <span>{u.username}</span>
                      <button onClick={() => deleteUser(u.username)} className="text-red-500">Delete</button>
                    </li>
                  ) : null
                )}
              </ul>
            </div>

            <div>
              <h2 className="font-semibold mt-6">Create Item</h2>
              <div className="flex gap-2 mt-2">
                <input
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="border p-2"
                />
                <input
                  placeholder="Details"
                  value={newItem.details}
                  onChange={(e) => setNewItem({ ...newItem, details: e.target.value })}
                  className="border p-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={newItem.max}
                  onChange={(e) =>
                    setNewItem({ ...newItem, max: e.target.value })
                  }
                  className="border p-2 w-24"
                />
                <button onClick={createItem} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
              </div>
            </div>
            </>
          )}

          <div>
            <h2 className="font-semibold">Item List</h2>
            <ul className="mt-2 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="border p-2 rounded">
                  {editingItem && editingItem.id === item.id ? (
                  <div className="space-y-2">
                      <input
                    className="border p-2 w-full"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  />
                  <input
                    className="border p-2 w-full"
                    value={editingItem.details}
                    onChange={(e) => setEditingItem({ ...editingItem, details: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    className="border p-2 w-full"
                    value={editingItem.max}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, max: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="bg-blue-600 text-white px-3 py-1 rounded">
                      Save
                    </button>
                    <button onClick={cancelEdit} className="text-gray-600">
                      Cancel
                    </button>
                    <button onClick={() => deleteItem(editingItem.id)} className="text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-bold">{item.name}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      ({item.claimedBy.length}/{item.max > 0 ? item.max : "∞"})
                      {item.claimedBy.length > 0 && ` ${item.claimedBy.join(", ")}`}
                    </span>
                    {" – "}
                    {item.details}
                  </div>
                  {isAdmin ? (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => startEdit(item)} className="text-blue-600">
                        Edit
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="text-red-600">
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => claimItem(item, currentUser.username)}
                        disabled={
                          item.claimedBy.includes(currentUser.username) ||
                          (item.max > 0 && item.claimedBy.length >= item.max)
                        }
                        className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        {item.claimedBy.includes(currentUser.username)
                          ? "Claimed"
                          : item.max > 0 && item.claimedBy.length >= item.max
                          ? "Full"
                          : "Claim"}
                      </button>
                      {item.claimedBy.includes(currentUser.username) && (
                        <button
                          onClick={() => returnItem(item, currentUser.username)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded"
                        >
                          Unclaim
                        </button>
                      )}
                    </div>
                    )}
                  </>
                )}
              </li>
            ))}
            </ul>
          </div>

          {!isAdmin && (
            <div>
              <h2 className="font-semibold">My Claimed Items</h2>
              <ul className="mt-2 space-y-2">
                {items
                  .filter((i) => i.claimedBy.includes(currentUser.username))
                  .map((item) => {
                    const max = item.max > 0 ? item.max : "∞";
                    return (
                      <li key={item.id} className="border p-2 rounded flex justify-between">
                        <span>
                          {item.name} ({item.claimedBy.length}/{max}) {item.claimedBy.join(", ")}
                        </span>
                        <button
                          onClick={() => returnItem(item, currentUser.username)}
                          className="text-red-600"
                        >
                          Return
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          <div>
            <h2 className="font-semibold">Chat</h2>
            <div
              className="mt-2 space-y-2 max-h-96 overflow-y-auto border p-2 rounded"
              ref={messagesRef}
            >
              {messages.map((m) => {
                const date = m.timestamp?.seconds
                  ? new Date(m.timestamp.seconds * 1000)
                  : null;
                return (
                  <div key={m.id} className="border p-2 rounded">
                    {date && (
                      <div className="text-xs text-gray-500">
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    <div className="font-semibold">{m.user}</div>
                    <div className="flex justify-between items-start">
                      <span>{m.text}</span>
                      {isAdmin && (
                        <button
                          onClick={() => deleteMessage(m.id)}
                          className="text-red-600 text-sm ml-2"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="border p-2 flex-grow"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Send
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
