// S4: what Node's own path.win32.join gives for a root, a child and a session id, to pin the pane's join in its tests.
import path from 'node:path';

const cases = [
    ['C:\\Users\\me\\.claude\\state\\software-developer-agent', 'team-on', 'abc-1'],
    ['C:\\state\\', 'team-on', 'abc-1'],
    ['C:\\', 'team-on', 'abc-1'],
    ['c:\\x', 'team-on', 'abc-1'],
    ['C:\\a\\\\b', 'team-on', 'abc-1'],
    ['C:\\a/b', 'team-on', 'abc-1'],
    ['C:\\a\\.\\b', 'team-on', 'abc-1'],
    ['C:\\a\\..\\b', 'team-on', 'abc-1'],
    ['C:\\a\\..\\..\\b', 'team-on', 'abc-1'],
    ['C:\\a\\..', 'team-on', 'abc-1'],
    ['C:\\a\\...\\b', 'x\\...\\y z.', 'abc-1'],
    ['C:\\a\\\\', 'state\\team-on', 'abc-1'],
    ['C:\\a:b\\c', 'team-on', 'abc-1'],
];
for (const [root, child, id] of cases) {
    console.log(JSON.stringify([root, child, id, path.win32.join(root, child, id)]));
}
