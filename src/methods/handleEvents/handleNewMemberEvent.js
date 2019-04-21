import { handleNewMemberMessage } from '../handleMessages';

function handleNewMemberEvent(event, client) {
  const msg = 'Welcome %USER% to the bootcamp room!';
  const user = event.getSender();
  const room = event.getRoomId();

  console.log(`Detected user ${user} join the room ${room}`);

  handleNewMemberMessage(msg, user, client, room);
};

export default handleNewMemberEvent;
