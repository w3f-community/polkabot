const markdown = require('markdown').markdown;

function handleNewMemberMessage(msg, user, client, room) {
  if (msg.length > 0) {
    msg = msg.replace(/^ +| +$/gm, '');
    let html = markdown.toHTML(msg);
    msg = msg.replace('%USER%', user);
    html = html.replace('%USER%', user);
    client.sendHtmlMessage(room, msg, html);
  }
};

export default handleNewMemberMessage;