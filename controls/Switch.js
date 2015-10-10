import ControlBase from './ControlBase';
import DOMNode from '../core/DOMNode';
import Animation from '../animation/Animation';
import Color from '../core/Color';
import Theme from '../theme';

const defaults = {
  classes: ['switch'],
  checked: false
};

export default class Switch extends ControlBase {

  /**
   * @param {Object} options Configuration options.
   * @param {Bool} [options.checked] Checked state of the switch.
   */
  constructor(options) {
    super();
    this._handle = this.addChild(new DOMNode({classes: ['handle']}));
    this._background = this.addChild(new DOMNode({classes: ['background']}));
    this._handle.on('tap', () => this.checked = !this.checked);
    this._background.on('tap', () => this.checked = !this.checked);
    this._color = new Color(this);
    this._color.on('changed', () => this.requestLayout());
    this._backgroundColor = new Color(this);
    this._backgroundColor.on('changed', () => this.requestLayout());
    this._borderColor = new Color(this);
    this._borderColor.on('changed', () => this.requestLayout());
    this.setOptions(defaults, Theme.defaults.switch, options);
  }

  toggle() {
    this.checked = !this.checked;
  }

  get checked() {
    return this._checked;
  }

  set checked(checked) {
    if (this._checked !== checked) {
      if (this.animated && (this._checked !== undefined)) {
        this._checked = checked;
        this._animate(() => this.checkedRatio = checked ? 1 : 0);
      } else {
        this._checked = checked;
        this.checkedRatio = this._checked ? 1 : 0;
      }
    }
  }

  get checkedRatio() {
    return this._checkedRatio;
  }

  set checkedRatio(perc) {
    if (this._checkedRatio !== perc) {
      if (Animation.isCollecting) {
        Animation.collect(this, 'checkedRatio', this._checkedRatio, perc);
      } else {
        this._checkedRatio = perc;
        this.requestLayout();
      }
    }
  }

  get color() {
    return this._color;
  }

  set color(color) {
    this._color.set(color);
  }

  get backgroundColor() {
    return this._backgroundColor;
  }

  set backgroundColor(color) {
    this._backgroundColor.set(color);
  }

  get borderColor() {
    return this._borderColor;
  }

  set borderColor(color) {
    this._borderColor.set(color);
  }
}
